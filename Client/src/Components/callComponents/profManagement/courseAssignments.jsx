import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus, X, Search, Users, Calendar } from 'lucide-react';

const CourseAssignments = ({
    professor,
    departmentAssignations,
    onAssignCourse,
    onDeleteAssignment,
    selectedSchoolYear,
    departmentId
}) => {
    const [assignmentSearch, setAssignmentSearch] = useState('');
    const [activeSemester, setActiveSemester] = useState('all');
    const [expandedAssignments, setExpandedAssignments] = useState({});

    const toggleExpandAssignment = (assignmentId) => {
        setExpandedAssignments(prev => ({
            ...prev,
            [assignmentId]: !prev[assignmentId]
        }));
    };

    const getFilteredAssignments = (profId, searchTerm, semesterFilter = 'all', schoolYearId) => {
        let profAssignments = departmentAssignations.filter(
            assignment => assignment.ProfessorId === profId
        );

        // Apply school year filter if provided
        if (schoolYearId) {
            profAssignments = profAssignments.filter(
                assignment => assignment.SchoolYearId === parseInt(schoolYearId, 10)
            );
        }

        // Apply semester filter if not 'all'
        if (semesterFilter !== 'all') {
            // Convert the semesterFilter to match the format in the data
            profAssignments = profAssignments.filter(
                assignment => assignment.Semester.toString() === semesterFilter.toString()
            );
        }

        // Apply search term filter if provided
        if (searchTerm) {
            profAssignments = profAssignments.filter(assignment =>
                assignment.Course?.Code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                assignment.Course?.Description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (assignment.Course?.RoomType?.Type &&
                    assignment.Course.RoomType.Type.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        return profAssignments;
    };

    const filteredAssignments = getFilteredAssignments(
        professor.id, 
        assignmentSearch, 
        activeSemester, 
        selectedSchoolYear
    );

    // Reset expanded state when professor or school year changes
    useEffect(() => {
        setExpandedAssignments({});
    }, [professor.id, selectedSchoolYear]);

    // Reset semester filter when school year changes
    useEffect(() => {
        setActiveSemester('all');
    }, [selectedSchoolYear]);

    return (
        <div className="p-8">
            <div className="mb-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800">Course Assignments</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-md">
                        {filteredAssignments.length}
                    </span>
                </div>
                <button className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition duration-150"
                    onClick={() => onAssignCourse(professor)}
                >
                    <Plus size={14} />
                    Assign Course
                </button>
            </div>

            {/* Display selected school year */}
            {selectedSchoolYear && (
                <div className="mb-3 bg-blue-50 p-2 rounded flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" />
                    <span className="text-sm text-blue-700">
                        Showing assignments for selected school year
                    </span>
                </div>
            )}

            <div className="mb-3 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                    <input type="text" placeholder="Search courses..." value={assignmentSearch} onChange={(e) => setAssignmentSearch(e.target.value)}
                        className="w-full p-2 pr-8 border rounded text-sm"
                    />
                    <Search size={16} className="absolute right-2 top-2.5 text-gray-400" />
                </div>

                {/* Semester filter */}
                <div className="flex gap-4 ml-3">
                    <button onClick={() => setActiveSemester('all')}
                        className={`px-3 py-1 text-xs font-medium rounded transition duration-150 ${activeSemester === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        All
                    </button>
                    <button onClick={() => setActiveSemester('1')}
                        className={`px-3 py-1 text-xs font-medium rounded transition duration-150 ${activeSemester === '1' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Sem 1
                    </button>
                    <button onClick={() => setActiveSemester('2')}
                        className={`px-3 py-1 text-xs font-medium rounded transition duration-150 ${activeSemester === '2' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Sem 2
                    </button>
                </div>
            </div>

            {filteredAssignments.length > 0 ? (
                <div className="max-h-150 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="space-y-2">
                        {filteredAssignments.map((assignment) => (
                            <div key={assignment.id} className="bg-gray-50 rounded hover:bg-gray-100 transition duration-150 group">
                                {/* Assignment content - keep existing code */}
                                {/* ... */}
                                
                                {/* Assignment header row */}
                                <div className="flex justify-between items-center p-2.5">
                                    <div className="flex items-start gap-2">
                                        <button 
                                            onClick={() => toggleExpandAssignment(assignment.id)}
                                            className="text-blue-500 mt-0.5 transform transition-transform duration-150"
                                            style={{ 
                                                transform: expandedAssignments[assignment.id] ? 'rotate(90deg)' : 'rotate(0deg)'
                                            }}
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                        <div>
                                            <span className="text-gray-800 text-sm font-medium">{assignment.Course?.Code}</span>
                                            <p className="text-gray-600 text-xs">{assignment.Course?.Description}</p>
                                            <p className="text-gray-600 text-xs">Semester: {assignment.Semester}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">{assignment.Course?.Units} Units</span>
                                                {assignment.Course?.RoomType && (
                                                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md">
                                                        {assignment.Course.RoomType.Type}
                                                    </span>
                                                )}
                                                {assignment.ProgYrSecs && assignment.ProgYrSecs.length > 0 && (
                                                    <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                                                        <Users size={10} />
                                                        {assignment.ProgYrSecs.length} {assignment.ProgYrSecs.length === 1 ? 'Section' : 'Sections'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="text-xs py-1 px-2 bg-white text-red-600 rounded hover:bg-red-50 transition duration-150 border border-gray-200 opacity-0 group-hover:opacity-100 flex items-center gap-1"
                                        onClick={() => onDeleteAssignment(assignment.id)}
                                    >
                                        <X size={12} />
                                        Remove Assignment
                                    </button>
                                </div>
                                
                                {/* Sections Assigned (collapsible) */}
                                {expandedAssignments[assignment.id] && assignment.ProgYrSecs && assignment.ProgYrSecs.length > 0 && (
                                    <div className="pl-8 pr-2 pb-2.5 border-t border-gray-200">
                                        <div className="pt-2 pb-1">
                                            <span className="text-xs font-medium text-gray-700">Assigned Sections:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded border border-gray-100">
                                            {assignment.ProgYrSecs.map((progYrSec, index) => (
                                                <React.Fragment key={progYrSec.id}>
                                                    <span className="text-xs font-medium text-gray-800">
                                                        {progYrSec.Program.Code}{progYrSec.Year}{progYrSec.Section}
                                                    </span>
                                                    {index < assignment.ProgYrSecs.length - 1 && (
                                                        <span className="text-gray-400 text-xs">,</span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm">
                        {assignmentSearch || activeSemester !== 'all' || selectedSchoolYear ? 
                            "No matching course assignments found" : 
                            "No courses assigned"}
                    </p>
                    {selectedSchoolYear && (
                        <p className="text-xs text-gray-400 mt-1">
                            Try selecting a different school year or semester
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default CourseAssignments;