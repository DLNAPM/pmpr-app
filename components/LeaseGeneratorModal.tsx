import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal';
import { Property, Lease, LeaseTemplate } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { DocumentTextIcon, ArrowDownTrayIcon, PencilSquareIcon, CloudArrowUpIcon, TrashIcon } from './Icons';

interface LeaseGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property;
    lease: Lease;
}

const DEFAULT_TEMPLATE = `RESIDENTIAL LEASE AGREEMENT

1. PARTIES:
This Lease Agreement is made between {{LANDLORD_NAME}} ("Landlord") and {{TENANT_NAMES}} ("Tenant").

2. PROPERTY:
Landlord leases to Tenant the following property:
{{PROPERTY_NAME}}
{{PROPERTY_ADDRESS}}

3. TERM:
The term of this lease shall be from {{LEASE_START}} to {{LEASE_END}}.

4. RENT:
The monthly rent for the property is \${{RENT_AMOUNT}}, payable on the first day of each month.

5. SECURITY DEPOSIT:
Tenant shall provide a security deposit of \${{SECURITY_DEPOSIT}} to be held by Landlord.

6. SIGNATURES:

Landlord Signature: ____________________ Date: __________

Tenant Signature: ____________________ Date: __________
`;

const LeaseGeneratorModal: React.FC<LeaseGeneratorModalProps> = ({ isOpen, onClose, property, lease }) => {
    const { user } = useAuth();
    const { leaseTemplates, addLeaseTemplate, updateLeaseTemplate, deleteLeaseTemplate } = useAppContext();
    
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
    const [editMode, setEditMode] = useState(false);
    const [templateName, setTemplateName] = useState('My Custom Template');
    const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATE);

    const currentTemplate = useMemo(() => {
        if (selectedTemplateId === 'default') return DEFAULT_TEMPLATE;
        return leaseTemplates.find(t => t.id === selectedTemplateId)?.content || DEFAULT_TEMPLATE;
    }, [selectedTemplateId, leaseTemplates]);

    const populatedLease = useMemo(() => {
        const tenantNames = lease.tenants.length > 0 ? lease.tenants.map(t => t.name).join(', ') : 'N/A';
        const landlordName = user?.companyName || user?.name || 'Owner';
        
        let content = currentTemplate;
        content = content.replace(/\{\{LANDLORD_NAME\}\}/g, landlordName);
        content = content.replace(/\{\{TENANT_NAMES\}\}/g, tenantNames);
        content = content.replace(/\{\{PROPERTY_NAME\}\}/g, property.name);
        content = content.replace(/\{\{PROPERTY_ADDRESS\}\}/g, property.address);
        content = content.replace(/\{\{LEASE_START\}\}/g, new Date(lease.leaseStart).toLocaleDateString());
        content = content.replace(/\{\{LEASE_END\}\}/g, new Date(lease.leaseEnd).toLocaleDateString());
        content = content.replace(/\{\{RENT_AMOUNT\}\}/g, lease.rentAmount.toString());
        content = content.replace(/\{\{SECURITY_DEPOSIT\}\}/g, property.securityDeposit.toString());
        
        return content;
    }, [currentTemplate, property, lease, user]);

    const handleDownload = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const fontSize = 11; // Slightly smaller for professional look
        const lineHeight = 6; 
        const usableWidth = pageWidth - (margin * 2);
        
        doc.setFont('times', 'normal'); // More professional for legal docs
        doc.setFontSize(fontSize);
        
        let cursorY = margin;

        // Add Company Logo if available
        if (user?.companyLogo) {
            try {
                // Determine format
                const format = user.companyLogo.includes('png') ? 'PNG' : 'JPEG';
                doc.addImage(user.companyLogo, format, margin, cursorY, 25, 25);
                cursorY += 30; // Move cursor down after logo
            } catch (error) {
                console.error("Error adding logo to PDF:", error);
            }
        } else if (user?.companyName) {
            doc.setFont('times', 'bold');
            doc.setFontSize(16);
            doc.text(user.companyName, margin, cursorY);
            cursorY += 10;
            doc.setFont('times', 'normal');
            doc.setFontSize(fontSize);
        }
        
        const splitText = doc.splitTextToSize(populatedLease, usableWidth);
        let pageCount = 1;
        
        splitText.forEach((line: string) => {
            if (cursorY + lineHeight > pageHeight - margin) {
                // Add page number to footer before adding new page
                doc.setFontSize(8);
                doc.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                
                doc.addPage();
                pageCount++;
                cursorY = margin;
                doc.setFontSize(fontSize);
            }
            doc.text(line, margin, cursorY);
            cursorY += lineHeight;
        });
        
        // Add last page footer
        doc.setFontSize(8);
        doc.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        const fileName = `Lease_${property.name.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
    };

    const handleSaveTemplate = async () => {
        if (editMode) {
            if (selectedTemplateId === 'default') {
                await addLeaseTemplate({
                    name: templateName,
                    content: templateContent
                });
            } else {
                const template = leaseTemplates.find(t => t.id === selectedTemplateId);
                if (template) {
                    await updateLeaseTemplate({
                        ...template,
                        name: templateName,
                        content: templateContent
                    });
                }
            }
            setEditMode(false);
        } else {
            setTemplateName(selectedTemplateId === 'default' ? 'New Template' : leaseTemplates.find(t => t.id === selectedTemplateId)?.name || 'New Template');
            setTemplateContent(currentTemplate);
            setEditMode(true);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                const content = re.target?.result as string;
                setTemplateContent(content);
                setEditMode(true);
            };
            reader.readAsText(file);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Generate Lease Document"
            maxWidth="max-w-4xl"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
                {/* Left Sidebar: Template Selection */}
                <div className="space-y-4 border-r border-gray-100 pr-4 overflow-y-auto lg:block hidden">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lease Templates</h3>
                    <div className="space-y-2">
                        <button
                            onClick={() => { setSelectedTemplateId('default'); setEditMode(false); }}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${selectedTemplateId === 'default' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 text-gray-600'}`}
                        >
                            <div className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                <span className="font-semibold text-sm">Default Template</span>
                            </div>
                        </button>
                        
                        {leaseTemplates.map(t => (
                            <div key={t.id} className="relative group">
                                <button
                                    onClick={() => { setSelectedTemplateId(t.id); setEditMode(false); }}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedTemplateId === t.id ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 text-gray-600'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <DocumentTextIcon className="w-4 h-4" />
                                        <span className="font-semibold text-sm truncate pr-6">{t.name}</span>
                                    </div>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteLeaseTemplate(t.id); if(selectedTemplateId === t.id) setSelectedTemplateId('default'); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-2 w-full p-3 rounded-xl border border-dashed border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                            <CloudArrowUpIcon className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider">Upload .txt Template</span>
                            <input type="file" accept=".txt,.html,.md" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>

                {/* Main View: Editor or Preview */}
                <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setEditMode(false)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${!editMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Preview
                            </button>
                            <button 
                                onClick={() => setEditMode(true)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${editMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Edit Template
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                            {editMode && (
                                <button 
                                    onClick={handleSaveTemplate}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                    title="Save Template"
                                >
                                    <CloudArrowUpIcon className="w-5 h-5 flex-shrink-0" />
                                </button>
                            )}
                            <button 
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                                title="Download as PDF"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                Download 
                            </button>
                            <button 
                                onClick={() => alert("DocuSign Integration Coming Soon!")}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <PencilSquareIcon className="w-4 h-4" />
                                Send for Signature
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative border border-gray-200 rounded-2xl">
                        <AnimatePresence mode="wait">
                            {editMode ? (
                                <motion.div 
                                    key="editor"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <input 
                                        type="text" 
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="Template Name"
                                        className="w-full px-4 py-3 border-b border-gray-100 text-sm font-bold text-slate-700 focus:outline-none"
                                    />
                                    <textarea 
                                        value={templateContent}
                                        onChange={(e) => setTemplateContent(e.target.value)}
                                        className="w-full flex-1 p-4 text-xs font-mono resize-none focus:outline-none whitespace-pre"
                                        placeholder="Paste your lease text here. Use placeholders: {{LANDLORD_NAME}}, {{TENANT_NAMES}}, {{PROPERTY_NAME}}, {{PROPERTY_ADDRESS}}, {{LEASE_START}}, {{LEASE_END}}, {{RENT_AMOUNT}}, {{SECURITY_DEPOSIT}}"
                                    />
                                    <div className="p-3 bg-slate-50 border-t border-gray-100 text-[10px] text-slate-500">
                                        <p className="font-bold mb-1 uppercase tracking-wider">Available Placeholders:</p>
                                        <p>{"{{LANDLORD_NAME}}, {{TENANT_NAMES}}, {{PROPERTY_NAME}}, {{PROPERTY_ADDRESS}}, {{LEASE_START}}, {{LEASE_END}}, {{RENT_AMOUNT}}, {{SECURITY_DEPOSIT}}"}</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="preview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="h-full p-6 bg-slate-100 overflow-y-auto"
                                >
                                    <div className="max-w-2xl mx-auto shadow-2xl bg-white p-12 min-h-full font-serif text-sm leading-loose text-slate-900 border border-gray-100 ring-1 ring-black/5">
                                        {user?.companyLogo && (
                                            <div className="mb-8 border-b pb-8">
                                                <img src={user.companyLogo} className="w-24 h-24 object-contain" alt="Company Logo" />
                                            </div>
                                        )}
                                        {!user?.companyLogo && user?.companyName && (
                                            <div className="mb-8 border-b pb-8">
                                                <h1 className="text-2xl font-bold uppercase">{user.companyName}</h1>
                                            </div>
                                        )}
                                        <div className="whitespace-pre-wrap">
                                            {populatedLease}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default LeaseGeneratorModal;
