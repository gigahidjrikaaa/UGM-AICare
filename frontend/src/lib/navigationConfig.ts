// frontend/src/lib/navigationConfig.ts
import { FiHome, FiMessageSquare, FiBookOpen, FiUser, FiCalendar, FiHelpCircle, FiSliders } from 'react-icons/fi';
import React from 'react'; // Import React to use JSX for icons

export interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType; // Change to ComponentType
}

export const mainNavItems: NavItem[] = [
    { label: "Aika Chat", href: "/aika", icon: FiMessageSquare },
    { label: "Journaling", href: "/journaling", icon: FiBookOpen },
    { label: "Profile", href: "/profile", icon: FiUser },
    { label: "Resources", href: "/resources", icon: FiHelpCircle },
    { label: "Appointments", href: "/appointments", icon: FiCalendar },
];

// Optional: Define separate items if needed for admin or other sections
export const adminNavItems: NavItem[] = [
    { label: "Admin Home", href: "/admin", icon: FiHome },
    { label: "Dashboard", href: "/admin/dashboard", icon: FiSliders },
    { label: "Users", href: "/admin/users", icon: FiUser },
    { label: "Appointments", href: "/admin/appointments", icon: FiCalendar },
    // ... other admin links
];