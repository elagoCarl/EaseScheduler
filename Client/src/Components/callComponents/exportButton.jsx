import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';          // named import
import autoTable from 'jspdf-autotable'; // grab helper directly
import * as XLSX from 'xlsx';

const ExportButton = ({ selectedRoom, schedules, days, timeSlots }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [pdfOrientation, setPdfOrientation] = useState('landscape'); // portrait or landscape

    const toggleDropdown = () => setIsOpen(!isOpen);
    const formatTimeRange = (start, end) => `${start.slice(0, 5)} - ${end.slice(0, 5)}`;

    const getScheduleForCell = (hour, dayIndex) => {
        const apiDayIndex = dayIndex + 1;
        return schedules.filter(schedule => {
            const [sHour] = schedule.Start_time.split(':').map(Number);
            return schedule.Day === apiDayIndex && sHour === hour;
        });
    };

    const exportToPDF = async () => {
        if (!selectedRoom) return;
        setExporting(true);

        try {
            const doc = new jsPDF({
                orientation: pdfOrientation,
                unit: 'mm',
                format: 'a4'
            });
            const pageWidth = doc.internal.pageSize.getWidth();

            // Title & details
            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
            doc.text(
                `Room Timetable - ${selectedRoom.Code}`,
                pageWidth / 2,
                15,
                { align: 'center' }
            );
            doc.setFontSize(10);
            doc.text(
                `${selectedRoom.Floor} Floor, ${selectedRoom.Building} Building (${selectedRoom.Type})`,
                pageWidth / 2,
                22,
                { align: 'center' }
            );

            // Build table data
            const tableHead = ['Time', ...days];
            const tableBody = timeSlots.map(hour => {
                const row = [`${hour.toString().padStart(2, '0')}:00`];
                days.forEach((_, dayIndex) => {
                    const cellSchedules = getScheduleForCell(hour, dayIndex);
                    if (cellSchedules.length) {
                        const content = cellSchedules
                            .map(schedule => {
                                const secs = schedule.ProgYrSecs
                                    .map(sec => `${sec.Program.Code} ${sec.Year}-${sec.Section}`)
                                    .join(', ');
                                return [
                                    formatTimeRange(schedule.Start_time, schedule.End_time),
                                    schedule.Assignation.Course.Code,
                                    secs,
                                    schedule.Assignation.Professor.Name
                                ].join('\n');
                            })
                            .join('\n\n');
                        row.push(content);
                    } else {
                        row.push('');
                    }
                });
                return row;
            });

            // Use the helper directly
            autoTable(doc, {
                head: [tableHead],
                body: tableBody,
                startY: 30,
                theme: 'grid',
                styles: {
                    fontSize: 7,
                    cellPadding: 1,
                    overflow: 'linebreak',
                    font: 'helvetica'
                },
                columnStyles: { 0: { cellWidth: 12 } },
                headStyles: {
                    fillColor: [66, 133, 244],
                    textColor: 255,
                    fontStyle: 'bold'
                }
            });

            doc.save(
                `Room_${selectedRoom.Code}_Timetable_${pdfOrientation}.pdf`
            );
        } catch (err) {
            console.error('PDF Export Error:', err);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const exportToExcel = () => {
        if (!selectedRoom) return;
        setExporting(true);
        try {
            const worksheet = XLSX.utils.aoa_to_sheet([
                [`Room Timetable - ${selectedRoom.Code}`],
                [`${selectedRoom.Floor} Floor, ${selectedRoom.Building} Building (${selectedRoom.Type})`],
                [],
                ['Time', ...days]
            ]);

            worksheet['!cols'] = [10, ...Array(days.length).fill(20)].map(w => ({ width: w }));
            worksheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: days.length } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: days.length } }
            ];

            timeSlots.forEach((hour, idx) => {
                const rowData = [`${hour.toString().padStart(2, '0')}:00`];
                days.forEach((_, dayIndex) => {
                    const cellSchedules = getScheduleForCell(hour, dayIndex);
                    if (cellSchedules.length) {
                        const txt = cellSchedules
                            .map(schedule => {
                                const secs = schedule.ProgYrSecs
                                    .map(sec => `${sec.Program.Code} ${sec.Year}-${sec.Section}`)
                                    .join(', ');
                                return `${formatTimeRange(schedule.Start_time, schedule.End_time)} - ${schedule.Assignation.Course.Code} - ${secs} - ${schedule.Assignation.Professor.Name}`;
                            })
                            .join('\n');
                        rowData.push(txt);
                    } else {
                        rowData.push('');
                    }
                });
                XLSX.utils.sheet_add_aoa(worksheet, [rowData], { origin: 4 + idx });
            });

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');
            XLSX.writeFile(
                workbook,
                `Room_${selectedRoom.Code}_Timetable.xlsx`
            );
        } catch (err) {
            console.error('Excel Export Error:', err);
            alert('Failed to export Excel file. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={toggleDropdown}
                disabled={exporting}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${exporting
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} transition-colors`}
            >
                <Download size={16} />
                <span>{exporting ? 'Exporting...' : 'Export'}</span>
            </button>

            {isOpen && !exporting && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 w-40">
                    {/* Orientation selector */}
                    <div className="px-4 py-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Orientation:</label>
                        <select
                            value={pdfOrientation}
                            onChange={e => setPdfOrientation(e.target.value)}
                            className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none"
                        >
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>

                    <button
                        onClick={() => { setIsOpen(false); exportToPDF(); }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                        Export to PDF
                    </button>
                    <button
                        onClick={() => { setIsOpen(false); exportToExcel(); }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                        Export to Excel
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportButton;
