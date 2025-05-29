// frontend/src/app/resources/page.tsx
"use client";

import ParticleBackground from '@/components/ui/ParticleBackground';
import React from 'react';
import { FiPhone, FiAlertTriangle, FiUsers, FiHeart, FiShield } from 'react-icons/fi';
import ResourceCard, { ResourceCardProps } from '@/components/ui/ResourceCard'; // Import the new ResourceCard

// --- Data for Resources ---
const ugmResources: ResourceCardProps[] = [
    {
        name: "Gadjah Mada Medical Center (GMC)",
        description: "Provides various medical services, including psychological counseling (\"Konseling Psikologi\"). Offers support for both physical and mental well-being.",
        targetAudience: "UGM Students, Staff, and General Public (some services)",
        servicesOffered: ["Medical Consultation", "Psychological Counseling", "Health Checks"],
        address: "SEKIP Blok L3, Sendowo, Sinduadi, Mlati, Sleman, DIY 55281",
        phone: "+62 (0274) 551412",
        whatsapp: "6281328786991", // Admin WhatsApp
        website: "gmc.ugm.ac.id",
        operatingHours: "Mon-Fri: 07.30 - 20.00, Sat: 07.30 - 14.00 (Confirm for specific services)",
        notes: "Psychological counseling may require an appointment. Check website for details.",
        category: "UGM",
    },
    {
        name: "Health Promoting University (HPU UGM)",
        description: "Focuses on holistic health services including mental health support, workshops, and community health programs to foster a healthy campus environment.",
        targetAudience: "UGM Community",
        servicesOffered: ["Mental Health Support", "Health Workshops", "Community Programs", "Wellness Info"],
        address: "Jl. Mahoni, Sekip Utara, Yogyakarta",
        phone: "+62 (0274) 552406",
        website: "hpu.ugm.ac.id",
        operatingHours: "Office hours, specific program times vary.",
        category: "UGM",
    },
    {
        name: "Faculty of Psychology Counseling Services (PPM)",
        description: "Professional counseling available through the Center for Public Service (Pusat Pelayanan Masyarakat) with licensed psychologists.",
        targetAudience: "UGM Students, Staff, and General Public",
        servicesOffered: ["Individual Counseling", "Group Counseling", "Psychological Assessment"],
        address: "Faculty of Psychology UGM, Jl. Sosio Humaniora Bulaksumur, Yogyakarta",
        phone: "+62 (0274) 550435",
        email: "ppm.psikologi@ugm.ac.id",
        website: "psikologi.ugm.ac.id/ppm",
        operatingHours: "Appointment-based, check website or contact for availability.",
        category: "UGM",
    },
    {
        name: "UGM Student Affairs Crisis Line (Ditmawa)",
        description: "Available for emergency student support 24/7. Managed by the Directorate of Student Affairs for urgent mental health concerns and crisis situations.",
        targetAudience: "UGM Students",
        servicesOffered: ["24/7 Crisis Support", "Emergency Mental Health Aid"],
        phone: "+62 812-2877-3800", // Also WhatsApp
        whatsapp: "6281228773800",
        website: "ditmawa.ugm.ac.id",
        operatingHours: "24/7",
        notes: "For urgent situations and crisis intervention.",
        category: "UGM",
    }
];

const nationalHotlines: ResourceCardProps[] = [
    {
        name: "Kemenkes SEJIWA (Counseling)",
        description: "Ministry of Health's national mental health counseling service.",
        targetAudience: "General Public (Indonesia)",
        servicesOffered: ["Mental Health Counseling", "Crisis Support"],
        phone: "119 ext. 8",
        website: "www.healing119.id", // Assuming this is the correct website
        operatingHours: "24/7 (typically, confirm via call)",
        category: "National",
    },
    {
        name: "LISA Suicide Prevention Helpline (Bahasa Indonesia)",
        description: "Dedicated suicide prevention helpline offering support in Bahasa Indonesia.",
        targetAudience: "Individuals in crisis, those with suicidal thoughts (Bahasa)",
        servicesOffered: ["Suicide Prevention", "Crisis Intervention"],
        phone: "+62 811 3855 472",
        category: "National",
    },
    {
        name: "LISA Suicide Prevention Helpline (English)",
        description: "Dedicated suicide prevention helpline offering support in English.",
        targetAudience: "Individuals in crisis, those with suicidal thoughts (English)",
        servicesOffered: ["Suicide Prevention", "Crisis Intervention"],
        phone: "+62 811 3815 472",
        category: "National",
    },
    {
        name: "Yayasan Inti Mata Jiwa",
        description: "Foundation providing mental health support and counseling services.",
        targetAudience: "General Public",
        servicesOffered: ["Counseling", "Mental Health Awareness"],
        phone: "+62 821 3860 8128",
        category: "National",
    },
    {
        name: "SAPA 129 (KemenPPPA)",
        description: "Ministry of Women Empowerment and Child Protection's hotline for reporting violence against women and children.",
        targetAudience: "Women and Children experiencing violence, reporters",
        servicesOffered: ["Reporting Violence", "Protection Services Info"],
        phone: "129",
        website: "sapa129.kemenpppa.go.id", // Example, verify actual website
        category: "National",
    },
    {
        name: "IndoPsyCare (Admin Chat for Info)",
        description: "Provides information and admin support for psychological care services.",
        targetAudience: "General Public seeking info",
        servicesOffered: ["Information on Psychologists", "Appointment Assistance (potentially)"],
        phone: "+62 812-1511-3685", // Likely WhatsApp for admin chat
        whatsapp: "6281215113685",
        category: "National",
    }
];


export default function ResourcesPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white pt-4 md:pt-10 relative pb-16"> {/* Increased top padding, added bottom padding */}
            <div className="absolute inset-0 z-0 opacity-30">
                <ParticleBackground count={80} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={1} maxSize={5} speed={0.8} />
            </div>

            <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 relative z-10">
                <header className="text-center mb-10 md:mb-12">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#FFCA40] mb-3">
                        Mental Health & Well-being Resources
                    </h1>
                    <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
                        Your well-being matters. Explore these resources for support, guidance, and information.
                    </p>
                </header>

                {/* Disclaimer - Enhanced Styling */}
                <div className="mb-10 md:mb-12 p-4 sm:p-5 bg-red-700/80 border-2 border-red-500/70 rounded-xl shadow-2xl flex items-start text-white">
                    <FiAlertTriangle className="text-red-200 mr-3 sm:mr-4 mt-1 flex-shrink-0" size={28} />
                    <div>
                        <h2 className="text-lg sm:text-xl font-semibold mb-1.5 text-red-100">Immediate Crisis Support</h2>
                        <p className="text-sm sm:text-base mb-3">
                            If you or someone you know is in immediate danger or crisis, please reach out to emergency services or a dedicated crisis hotline immediately. <strong>Aika is not a substitute for emergency services.</strong>
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <a href="tel:112" className="px-4 py-2 bg-red-500 hover:bg-red-400 rounded-lg font-semibold text-white transition-colors text-sm inline-flex items-center shadow-md">
                                <FiPhone className="mr-2" /> Call Emergency: 112
                            </a>
                            <a href="tel:119;ext=8" className="px-4 py-2 bg-red-500 hover:bg-red-400 rounded-lg font-semibold text-white transition-colors text-sm inline-flex items-center shadow-md">
                                <FiHeart className="mr-2" /> Kemenkes Hotline: 119 (ext. 8)
                            </a>
                        </div>
                    </div>
                </div>

                {/* UGM On-Campus Resources */}
                <section className="mb-10 md:mb-12">
                    <h2 className="text-2xl sm:text-3xl font-semibold border-b-2 border-[#FFCA40]/60 pb-3 mb-6 flex items-center text-white">
                        <FiUsers className="mr-3 text-[#FFCA40]" size={28} /> UGM On-Campus Resources
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                        {ugmResources.map((resource) => (
                            <ResourceCard key={resource.name} {...resource} />
                        ))}
                    </div>
                </section>

                {/* National Hotlines & Support */}
                <section className="mb-10 md:mb-12">
                    <h2 className="text-2xl sm:text-3xl font-semibold border-b-2 border-[#FFCA40]/60 pb-3 mb-6 flex items-center text-white">
                        <FiShield className="mr-3 text-[#FFCA40]" size={28} /> National Hotlines & Support (Indonesia)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {nationalHotlines.map((resource) => (
                            <ResourceCard key={resource.name} {...resource} />
                        ))}
                    </div>
                </section>

                {/* Future: How to Choose Section / Filters / Search */}
                {/* 
                <section className="mb-10 md:mb-12 p-6 bg-white/5 rounded-xl border border-white/10">
                    <h2 className="text-xl font-semibold mb-4 text-ugm-gold-light">Finding the Right Support</h2>
                    <p className="text-gray-300">Not sure where to start? [Placeholder for guidance]</p>
                </section>
                */}

            </main>
        </div>
    );
}