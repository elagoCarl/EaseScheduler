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

    // Determine which mode we're in based on props
    const mode = selectedRoom ? "room" : selectedSection ? "section" : selectedProf ? "prof" : null;

    if (!mode) return null; // Don't render if no valid props are provided

    const toggleDropdown = () => setIsOpen(!isOpen);
    const formatTimeRange = (start, end) => `${start.slice(0, 5)} - ${end.slice(0, 5)}`;

    // Generates title text based on current mode
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

    // Generates subtitle text based on current mode
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

    // Gets the filename based on current mode
    const getFilename = (extension) => {
        switch (mode) {
            case "room":
                return `Room_${selectedRoom.Code}_Timetable${extension}`;
            case "section":
                return `Section_${selectedSection.Program}_${selectedSection.Year}_${selectedSection.Section}_Timetable${extension}`;
            case "prof":
                return `Professor_${selectedProf.Name.replace(/\s+/g, '_')}_Timetable${extension}`;
            default:
                return `Timetable${extension}`;
        }
    };

    // Get schedules for a specific cell
    const getScheduleForCell = (hour, dayIndex) => {
        const apiDayIndex = dayIndex + 1;
        return schedules.filter(schedule => {
            const [sHour] = schedule.Start_time.split(':').map(Number);
            return schedule.Day === apiDayIndex && sHour === hour;
        });
    };

    // Format section information
    const formatSections = (schedule) => {
        if (!schedule.ProgYrSecs || !schedule.ProgYrSecs.length) return "N/A";
        return schedule.ProgYrSecs
            .map(sec => `${sec.Program?.Code || ''} ${sec.Year}-${sec.Section}`)
            .join(', ');
    };

    // Format room information (for section and prof views)
    const formatRoomInfo = (schedule) => {
        if (mode === "room") return ""; // Don't show room info in room timetable exports

        const room = schedule?.Assignation?.Rooms?.[0];
        if (!room) return "Room: N/A";
        return `Room: ${room.Code} (${room.Building})`;
    };

    // Format course information
    const formatCourseInfo = (schedule) => {
        if (!schedule?.Assignation?.Course) return "N/A";
        const course = schedule.Assignation.Course;
        return `${course.Code} - ${course.Description}`;
    };

    // Format professor information (for room and section views)
    const formatProfInfo = (schedule) => {
        if (mode === "prof") return ""; // Don't show prof info in prof timetable exports

        const prof = schedule?.Assignation?.Professor;
        if (!prof) return "Professor: N/A";
        return `Prof: ${prof.Name}`;
    };

    const exportToPDF = async () => {
        if (!mode) return;
        setExporting(true);
        setExportType('pdf');

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
                getTitleText(),
                pageWidth / 2,
                15,
                { align: 'center' }
            );
            doc.setFontSize(10);
            doc.text(
                getSubtitleText(),
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
                                const sections = formatSections(schedule);
                                const roomInfo = formatRoomInfo(schedule);
                                const profInfo = formatProfInfo(schedule);
                                const courseInfo = formatCourseInfo(schedule);

                                return [
                                    formatTimeRange(schedule.Start_time, schedule.End_time),
                                    courseInfo,
                                    sections,
                                    profInfo,
                                    roomInfo
                                ].filter(Boolean).join('\n');
                            })
                            .join('\n\n');
                        row.push(content);
                    } else {
                        row.push('');
                    }
                });
                return row;
            });

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
                    fillColor: [59, 130, 246], // Tailwind blue-500
                    textColor: 255,
                    fontStyle: 'bold'
                }
            });

            doc.save(getFilename(`_${pdfOrientation}.pdf`));
        } catch (err) {
            console.error('PDF Export Error:', err);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setExporting(false);
            setExportType(null);
        }
    };

    const exportToExcel = () => {
        if (!mode) return;
        setExporting(true);
        setExportType('excel');

        try {
            const worksheet = XLSX.utils.aoa_to_sheet([
                [getTitleText()],
                [getSubtitleText()],
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
                                const sections = formatSections(schedule);
                                const roomInfo = formatRoomInfo(schedule);
                                const profInfo = formatProfInfo(schedule);
                                const courseInfo = schedule.Assignation?.Course?.Code || "N/A";

                                const parts = [
                                    formatTimeRange(schedule.Start_time, schedule.End_time),
                                    courseInfo,
                                    sections
                                ];

                                if (profInfo) parts.push(profInfo);
                                if (roomInfo) parts.push(roomInfo);

                                return parts.filter(Boolean).join(' - ');
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
            XLSX.writeFile(workbook, getFilename('.xlsx'));
        } catch (err) {
            console.error('Excel Export Error:', err);
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
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 shadow-sm"
                aria-expanded={isOpen}
                aria-haspopup="true"
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
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {isOpen && !exporting && (
                <div className="w-max absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-3 z-20 overflow-hidden transition-all duration-200 animate-in fade-in zoom-in origin-top-right">
                    <div className="flex justify-between items-center px-4 pb-2 border-b border-gray-100">
                        <h3 className="font-medium text-gray-700">Export Options</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="px-4 py-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">PDF Orientation:</label>
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setPdfOrientation('portrait')}
                                className={`flex-1 px-3 py-2 text-xs rounded-md border ${pdfOrientation === 'portrait'
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Portrait
                            </button>
                            <button
                                onClick={() => setPdfOrientation('landscape')}
                                className={`flex-1 px-3 py-2 text-xs rounded-md border ${pdfOrientation === 'landscape'
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Landscape
                            </button>
                        </div>
                    </div>

                    <div className="px-3 pt-1">
                        <button
                            onClick={() => { setIsOpen(false); exportToPDF(); }}
                            className="w-full flex items-center gap-2 text-left px-4 py-3 mb-1 hover:bg-blue-50 rounded-md text-blue-700 transition-colors"
                        >
                            <FileText size={16} />
                            <span>Export to PDF</span>
                        </button>
                        <button
                            onClick={() => { setIsOpen(false); exportToExcel(); }}
                            className="w-full flex items-center gap-2 text-left px-4 py-3 hover:bg-green-50 rounded-md text-green-700 transition-colors"
                        >
                            <FileSpreadsheet size={16} />
                            <span>Export to Excel</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportButton;