// frontend/src/app/resources/page.tsx
"use client";

import ParticleBackground from '@/components/ui/ParticleBackground';
import React from 'react';
import { FiPhone, FiMapPin, FiAlertTriangle, FiUsers, FiGlobe, FiMessageSquare, FiMail } from 'react-icons/fi'; // Example icons

export default function ResourcesPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white pt-16 relative"> {/* Adjust pt-16 if header height differs */}
            <div className="absolute inset-0 z-0 opacity-40">
                <ParticleBackground count={70} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={1} />
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8 relative z-10">
                <h1 className="text-3xl font-bold text-center mb-8 text-[#FFCA40]">Mental Health Resources</h1>

                {/* Disclaimer */}
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start text-white">
                    <FiAlertTriangle className="text-red-300 mr-3 mt-1 flex-shrink-0" size={20} />
                    <div>
                        <h2 className="font-semibold mb-1">Immediate Crisis Support</h2>
                        <p className="text-sm">
                            If you or someone you know is in immediate danger or crisis, please reach out to emergency services or a dedicated crisis hotline immediately. Aika is not a substitute for emergency services.
                        </p>
                        <p className="text-sm mt-2">
                            Call Emergency Services: <a href="tel:112" className="font-semibold underline hover:text-red-200">112</a> or the Ministry of Health Hotline: <a href="tel:119" className="font-semibold underline hover:text-red-200">119 (ext. 8)</a>.
                        </p>
                    </div>
                </div>

                {/* UGM On-Campus Resources */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold border-b border-[#FFCA40]/50 pb-2 mb-4 flex items-center">
                        <FiUsers className="mr-3 text-[#FFCA40]" /> UGM On-Campus Resources
                    </h2>
                    <div className="space-y-5">
                        {/* Gadjah Mada Medical Center (GMC) */}
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-2">Gadjah Mada Medical Center (GMC)</h3>
                            <p className="text-sm text-gray-300 mb-3">Provides various medical services, including psychological counseling (&quot;Konseling Psikologi&quot;).</p>
                            <div className="flex items-start text-sm mb-2">
                                <FiMapPin className="mr-2 mt-1 flex-shrink-0 text-gray-400" />
                                <span>SEKIP Blok L3, Sendowo, Sinduadi, Mlati, Kabupaten Sleman, DIY 55281</span>
                            </div>
                            <div className="flex items-center text-sm mb-2">
                                <FiPhone className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="tel:+62274551412" className="hover:text-[#FFCA40]">+62 (0274) 551412</a>
                            </div>
                            <div className="flex items-center text-sm mb-1">
                                <FiMessageSquare className="mr-2 flex-shrink-0 text-gray-400" />
                                <span>WhatsApp Admin: <a href="https://wa.me/6281328786991" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFCA40]">0813-2878-6991</a></span>
                            </div>
                            <div className="text-xs text-gray-400 ml-6"> (Other numbers available for Prolanis & Claims)</div>
                            <div className="flex items-center text-sm mt-1">
                                <FiGlobe className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="https://gmc.ugm.ac.id/" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFCA40]">gmc.ugm.ac.id</a>
                            </div>
                        </div>

                        {/* Health Promoting University (HPU UGM) */}
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-2">Health Promoting University (HPU UGM)</h3>
                            <p className="text-sm text-gray-300 mb-3">Provides holistic health services including mental health support, workshops and community health programs.</p>
                            <div className="flex items-start text-sm mb-2">
                                <FiMapPin className="mr-2 mt-1 flex-shrink-0 text-gray-400" />
                                <span>Jl. Mahoni, Sekip Utara, Yogyakarta</span>
                            </div>
                            <div className="flex items-center text-sm mb-2">
                                <FiPhone className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="tel:+62274552406" className="hover:text-[#FFCA40]">+62 (0274) 552406</a>
                            </div>
                            <div className="flex items-center text-sm mt-1">
                                <FiGlobe className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="https://hpu.ugm.ac.id" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFCA40]">hpu.ugm.ac.id</a>
                            </div>
                        </div>

                        {/* Faculty of Psychology Counseling Services */}
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-2">Faculty of Psychology Counseling Services</h3>
                            <p className="text-sm text-gray-300 mb-3">Professional counseling available through the Center for Public Service (Pusat Pelayanan Masyarakat) with licensed psychologists.</p>
                            <div className="flex items-start text-sm mb-2">
                                <FiMapPin className="mr-2 mt-1 flex-shrink-0 text-gray-400" />
                                <span>Faculty of Psychology UGM, Jl. Sosio Humaniora Bulaksumur, Yogyakarta</span>
                            </div>
                            <div className="flex items-center text-sm mb-2">
                                <FiPhone className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="tel:+62274550435" className="hover:text-[#FFCA40]">+62 (0274) 550435</a>
                            </div>
                            <div className="flex items-center text-sm mb-1">
                                <FiMail className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="mailto:ppm.psikologi@ugm.ac.id" className="hover:text-[#FFCA40]">ppm.psikologi@ugm.ac.id</a>
                            </div>
                            <div className="flex items-center text-sm mt-1">
                                <FiGlobe className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="https://psikologi.ugm.ac.id/ppm" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFCA40]">psikologi.ugm.ac.id/ppm</a>
                            </div>
                        </div>

                        {/* UGM Student Affairs Crisis Line */}
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-2">UGM Student Affairs Crisis Line</h3>
                            <p className="text-sm text-gray-300 mb-3">Available for emergency student support 24/7. Managed by the Directorate of Student Affairs for urgent mental health concerns.</p>
                            <div className="flex items-center text-sm mb-2">
                                <FiPhone className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="tel:+6281228773800" className="hover:text-[#FFCA40]">+62 812-2877-3800</a> (WhatsApp/Call)
                            </div>
                            <div className="flex items-center text-sm mt-1">
                                <FiGlobe className="mr-2 flex-shrink-0 text-gray-400" />
                                <a href="https://ditmawa.ugm.ac.id" target="_blank" rel="noopener noreferrer" className="hover:text-[#FFCA40]">ditmawa.ugm.ac.id</a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* National Hotlines & Support */}
                <section>
                    <h2 className="text-2xl font-semibold border-b border-[#FFCA40]/50 pb-2 mb-4 flex items-center">
                        <FiPhone className="mr-3 text-[#FFCA40]" /> National Hotlines & Support (Indonesia)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ResourceItem name="Kemenkes SEJIWA (Counseling)" phone="119 ext. 8" website="www.healing119.id" />
                        <ResourceItem name="LISA Suicide Prevention Helpline (Bahasa)" phone="+62 811 3855 472" />
                        <ResourceItem name="LISA Suicide Prevention Helpline (English)" phone="+62 811 3815 472" />
                        <ResourceItem name="Yayasan Inti Mata Jiwa" phone="+62 821 3860 8128" />
                        <ResourceItem name="SAPA 129 (Kemenppa - Child/Women Protection)" phone="129" />
                        <ResourceItem name="IndoPsyCare (Admin Chat for Info)" phone="+62 812-1511-3685" />
                    </div>
                </section>

            </main>
        </div>
    );
}

// Helper component for resource items
interface ResourceItemProps {
    name: string;
    phone?: string;
    website?: string;
}

const ResourceItem: React.FC<ResourceItemProps> = ({ name, phone, website }) => (
    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
        <h4 className="font-medium text-white">{name}</h4>
        {phone && (
            <div className="flex items-center text-sm mt-1">
                <FiPhone className="mr-2 flex-shrink-0 text-gray-400" size={14} />
                <a href={`tel:${phone.replace(/\s+/g, '')}`} className="text-gray-300 hover:text-[#FFCA40]">{phone}</a>
            </div>
        )}
        {website && (
            <div className="flex items-center text-sm mt-1">
                <FiGlobe className="mr-2 flex-shrink-0 text-gray-400" size={14} />
                <a href={`http://${website}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#FFCA40] truncate">{website}</a>
            </div>
        )}
    </div>
);