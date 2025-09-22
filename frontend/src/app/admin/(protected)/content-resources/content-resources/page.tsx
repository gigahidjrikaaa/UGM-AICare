import React from 'react';
import AdminHeader from '@/components/ui/admin/AdminHeader';
import AdminSidebar from '@/components/ui/admin/AdminSidebar';
import { Metadata } from 'next';
import { FiFileText } from 'react-icons/fi';
import ContentResourcesTable from '@/components/admin/content-resources/ContentResourcesTable';

export const metadata: Metadata = {
    title: 'Admin: Content Resources',
};

const ContentResourcesPage = () => {
    return (
        <div className="flex h-screen bg-[#001D58]">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#001D58] p-6">
                    <div className="container mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center">
                                    <FiFileText className="mr-3 text-[#FFCA40]" />
                                    Content Resources
                                </h1>
                                <p className="text-gray-400 mt-1">Manage content for the RAG model</p>
                            </div>
                        </div>
                        <ContentResourcesTable />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ContentResourcesPage;
