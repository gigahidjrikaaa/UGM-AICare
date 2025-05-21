// frontend/src/components/journaling/ActivityCalendar.tsx
"use client";

import React from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    addDays,
    isSameMonth,
    isSameDay,
} from 'date-fns';
import { id } from 'date-fns/locale'; // For Indonesian day names if needed
import { FiChevronLeft, FiChevronRight, FiLoader } from 'react-icons/fi';

// Define the structure of the data received from the backend
interface ActivityData {
    hasJournal: boolean;
    hasConversation: boolean;
}
interface ActivitySummary {
    [dateStr: string]: ActivityData; // Key is "YYYY-MM-DD"
}

interface ActivityCalendarProps {
    currentMonth: Date; // The month currently being displayed
    activityData: ActivitySummary; // Data fetched from the backend
    onMonthChange: (newMonth: Date) => void; // Callback to change month in parent
    isLoading?: boolean; // Optional loading state
    onDateClick?: (date: Date) => void; // Optional callback for date click
}

export default function ActivityCalendar({
    currentMonth,
    activityData,
    onMonthChange,
    isLoading = false,
    onDateClick,
}: ActivityCalendarProps) {

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start week on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
        days.push(day);
        day = addDays(day, 1);
    }

    const getDayClasses = (day: Date): string => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const data = activityData[dateStr];
        let classes = `text-center py-1 text-xs rounded aspect-square flex flex-col items-center justify-center transition-colors duration-150 relative ${onDateClick ? 'cursor-pointer' : 'cursor-default'} `;

        if (!isSameMonth(day, monthStart)) {
            classes += " text-gray-600 hover:bg-gray-700/50"; // Dim days from other months
            if (onDateClick) classes += " hover:bg-gray-700/50";
        } else {
             classes += " text-gray-200 hover:bg-gray-700/50";
             if (onDateClick) classes += " hover:bg-gray-700/70"; // Brighter hover for current month days
             if (isSameDay(day, new Date())) {
                 classes += " border border-[#FFCA40]"; // Highlight today
             }

             // Apply activity markers
             if (data) {
                 if (data.hasJournal && data.hasConversation) {
                     // Both activities - e.g., purple background or two dots
                     classes += " bg-purple-600/40 hover:bg-purple-600/60";
                 } else if (data.hasJournal) {
                     // Only Journal - e.g., green background or dot
                     classes += " bg-green-600/40 hover:bg-green-600/60";
                 } else if (data.hasConversation) {
                     // Only Conversation - e.g., blue background or dot
                     classes += " bg-blue-600/40 hover:bg-blue-600/60";
                 }
             }
        }

        return classes;
    };

    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']; // Adjust if locale needed

    return (
        <div className="bg-white/5 p-2 sm:p-3 rounded-lg border border-white/10 mb-6">
            {/* Header: Month Navigation */}
            <div className="flex items-center justify-between mb-3 px-1">
                <button
                    onClick={() => onMonthChange(subMonths(currentMonth, 1))}
                    className="p-1.5 rounded-full hover:bg-white/10 transition"
                    aria-label="Previous month"
                >
                    <FiChevronLeft size={18} />
                </button>
                <h3 className="font-semibold text-base sm:text-lg text-center">
                    {format(currentMonth, 'MMMM yyyy', { locale: id })}
                </h3>
                <button
                    onClick={() => onMonthChange(addMonths(currentMonth, 1))}
                    className="p-1.5 rounded-full hover:bg-white/10 transition"
                    aria-label="Next month"
                >
                    <FiChevronRight size={18} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 relative">
                 {/* Loading Overlay */}
                 {isLoading && (
                    <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
                        <FiLoader className="animate-spin text-xl"/>
                    </div>
                 )}

                {/* Day Names Header */}
                {dayNames.map(name => (
                    <div key={name} className="text-center text-xs font-medium text-gray-400 pb-1">
                        {name}
                    </div>
                ))}

                {/* Day Cells */}
                {days.map((d, i) => {
                    const isInteractive = onDateClick && isSameMonth(d, monthStart);
                    return (
                        <div
                            key={i}
                            className={getDayClasses(d)}
                            onClick={isInteractive ? () => onDateClick!(d) : undefined} // Call onDateClick only for current month days
                            onKeyDown={isInteractive ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    onDateClick!(d);
                                }
                            } : undefined}
                            {...(isInteractive ? { role: "button" } : {})}
                            tabIndex={isInteractive ? 0 : undefined}
                            aria-label={isInteractive ? `Journal for ${format(d, 'MMMM d, yyyy')}` : undefined}
                        >
                            {format(d, 'd')}

                            {/* Example using dots instead of background */}

                            {activityData[format(d, 'yyyy-MM-dd')]?.hasJournal && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-2 w-1 h-1 bg-green-400 rounded-full"></span>
                            )}
                            {activityData[format(d, 'yyyy-MM-dd')]?.hasConversation && (
                                <span className="absolute bottom-1 left-1/2 translate-x-1 w-1 h-1 bg-blue-400 rounded-full"></span>
                            )}
                        </div>
                    );
                })}
            </div>

             {/* Optional Legend */}
            <div className="flex justify-center space-x-3 mt-3 text-xs">
                 <span className="flex items-center"><span className="w-2.5 h-2.5 bg-green-600 rounded-full mr-1.5"></span> Journal</span>
                 <span className="flex items-center"><span className="w-2.5 h-2.5 bg-blue-600 rounded-full mr-1.5"></span> Chat</span>
                 <span className="flex items-center"><span className="w-2.5 h-2.5 bg-purple-600 rounded-full mr-1.5"></span> Both</span>
             </div>
        </div>
    );
}