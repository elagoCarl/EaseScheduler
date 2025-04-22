import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, X, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ExportButton = ({
    selectedRoom,
    selectedSection,
    selectedProf,
    schedules,
    days,
    timeSlots
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportType, setExportType] = useState(null);
    const [pdfOrientation, setPdfOrientation] = useState('landscape');

    const mode = selectedRoom ? "room" : selectedSection ? "section" : selectedProf ? "prof" : null;
    if (!mode) return null;

    const toggleDropdown = () => setIsOpen(!isOpen);
    const formatTimeRange = (start, end) => `${start.slice(0, 5)} - ${end.slice(0, 5)}`;

    const getTitleText = () => {
        switch (mode) {
            case "room":
                return `Room Timetable - ${selectedRoom.Code}`;
            case "section":
                return `Section Timetable - ${selectedSection.Program} ${selectedSection.Year}-${selectedSection.Section}`;
            case "prof":
                return `Professor Timetable - ${selectedProf.Name}`;
            default:
                return "Timetable";
        }
    };

    const getSubtitleText = () => {
        switch (mode) {
            case "room":
                return `${selectedRoom.Floor} Floor, ${selectedRoom.Building} Building (${selectedRoom.Type})`;
            case "section":
                return `${selectedSection.Program} Program, Year ${selectedSection.Year}, Section ${selectedSection.Section}`;
            case "prof":
                return `Professor ID: ${selectedProf.id}`;
            default:
                return "";
        }
    };

    const getFilename = (ext) => {
        switch (mode) {
            case "room":
                return `Room_${selectedRoom.Code}_Timetable${ext}`;
            case "section":
                return `Section_${selectedSection.Program}_${selectedSection.Year}_${selectedSection.Section}_Timetable${ext}`;
            case "prof":
                return `Professor_${selectedProf.Name.replace(/\s+/g, '_')}_Timetable${ext}`;
            default:
                return `Timetable${ext}`;
        }
    };

    const getScheduleForCell = (hour, dayIndex) => {
        const apiDayIndex = dayIndex + 1;
        return schedules.filter(s => {
            const [sHour] = s.Start_time.split(':').map(Number);
            return s.Day === apiDayIndex && sHour === hour;
        });
    };

    const formatSections = (schedule) => {
        if (!schedule.ProgYrSecs?.length) return "N/A";
        return schedule.ProgYrSecs
            .map(sec => `${sec.Program?.Code || ''} ${sec.Year}-${sec.Section}`)
            .join(', ');
    };

    // *** Updated to read room from schedule.Room ***
    const formatRoomInfo = (schedule) => {
        if (mode === "room") return "";
        const room = schedule.Room;
        if (!room) return "Room: N/A";
        // include building and floor if you like:
        const parts = [`Room: ${room.Code}`];
        if (room.Building) parts.push(room.Building);
        if (room.Floor) parts.push(`Floor ${room.Floor}`);
        return parts.join(' — ');
    };

    const formatCourseInfo = (schedule) => {
        const course = schedule.Assignation?.Course;
        return course
            ? `${course.Code} - ${course.Description}`
            : "N/A";
    };

    const formatProfInfo = (schedule) => {
        if (mode === "prof") return "";
        const prof = schedule.Assignation?.Professor;
        return prof ? `Prof: ${prof.Name}` : "Professor: N/A";
    };

    const exportToPDF = async () => {
        setExporting(true);
        setExportType('pdf');

        try {
            const doc = new jsPDF({ orientation: pdfOrientation, unit: 'mm', format: 'a4' });
            const w = doc.internal.pageSize.getWidth();

            doc.setFontSize(16);
            doc.text(getTitleText(), w / 2, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.text(getSubtitleText(), w / 2, 22, { align: 'center' });

            const head = ['Time', ...days];
            const body = timeSlots.map(hour => {
                const row = [`${hour.toString().padStart(2, '0')}:00`];
                days.forEach((_, di) => {
                    const cell = getScheduleForCell(hour, di);
                    if (cell.length) {
                        const txt = cell.map(s => {
                            const parts = [
                                formatTimeRange(s.Start_time, s.End_time),
                                formatCourseInfo(s),
                                formatSections(s),
                                formatProfInfo(s),
                                formatRoomInfo(s)
                            ].filter(Boolean);
                            return parts.join('\n');
                        }).join('\n\n');
                        row.push(txt);
                    } else {
                        row.push('');
                    }
                });
                return row;
            });

            autoTable(doc, {
                head: [head],
                body,
                startY: 30,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
                columnStyles: { 0: { cellWidth: 12 } },
                headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' }
            });

            doc.save(getFilename(`_${pdfOrientation}.pdf`));
        } catch (e) {
            console.error('PDF Export Error:', e);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setExporting(false);
            setExportType(null);
        }
    };

    const exportToExcel = () => {
        setExporting(true);
        setExportType('excel');

        try {
            // header
            const ws = XLSX.utils.aoa_to_sheet([
                [getTitleText()],
                [getSubtitleText()],
                [],
                ['Time', ...days]
            ]);

            ws['!cols'] = [{ width: 10 }, ...days.map(() => ({ width: 20 }))];
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: days.length } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: days.length } }
            ];

            // rows
            timeSlots.forEach((hour, idx) => {
                const row = [`${hour.toString().padStart(2, '0')}:00`];
                days.forEach((_, di) => {
                    const cell = getScheduleForCell(hour, di);
                    if (cell.length) {
                        const txt = cell.map(s => {
                            const parts = [
                                formatTimeRange(s.Start_time, s.End_time),
                                s.Assignation?.Course?.Code || 'N/A',
                                formatSections(s),
                                formatProfInfo(s),
                                formatRoomInfo(s)
                            ].filter(Boolean);
                            return parts.join(' - ');
                        }).join('\n');
                        row.push(txt);
                    } else {
                        row.push('');
                    }
                });
                XLSX.utils.sheet_add_aoa(ws, [row], { origin: 4 + idx });
            });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
            XLSX.writeFile(wb, getFilename('.xlsx'));
        } catch (e) {
            console.error('Excel Export Error:', e);
            alert('Failed to export Excel file. Please try again.');
        } finally {
            setExporting(false);
            setExportType(null);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={toggleDropdown}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-shadow"
            >
                {exporting ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Exporting {exportType === 'pdf' ? 'PDF' : 'Excel'}...</span>
                    </>
                ) : (
                    <>
                        <Download size={16} />
                        <span>Export</span>
                        <ChevronDown size={14} className={`${isOpen ? 'rotate-180' : ''} transition-transform`} />
                    </>
                )}
            </button>
            {isOpen && !exporting && (
                <div className="absolute right-0 mt-2 w-max bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <div className="flex justify-between items-center px-4 py-2 border-b">
                        <h3 className="text-gray-700 font-medium">Export Options</h3>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="px-4 py-3">
                        <label className="block text-xs mb-1">PDF Orientation:</label>
                        <div className="flex gap-2">
                            {['portrait', 'landscape'].map(o => (
                                <button
                                    key={o}
                                    onClick={() => setPdfOrientation(o)}
                                    className={`flex-1 px-3 py-1 text-xs rounded border ${pdfOrientation === o
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {o.charAt(0).toUpperCase() + o.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="px-3 pb-3">
                        <button onClick={() => { setIsOpen(false); exportToPDF(); }}
                            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-blue-50 text-blue-700">
                            <FileText size={16} /> Export to PDF
                        </button>
                        <button onClick={() => { setIsOpen(false); exportToExcel(); }}
                            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-green-50 text-green-700">
                            <FileSpreadsheet size={16} /> Export to Excel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportButton;
