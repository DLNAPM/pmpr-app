import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal';
import { Property, Lease, LeaseTemplate, Room } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { DocumentTextIcon, ArrowDownTrayIcon, PencilSquareIcon, CloudArrowUpIcon, TrashIcon, BuildingOfficeIcon } from './Icons';
import { formatDate } from '../utils';

interface LeaseGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property;
    lease: Lease;
    multiRooms?: Room[];
    tenantNameOverride?: string;
}

const DEFAULT_TEMPLATE = `RESIDENTIAL LEASE AGREEMENT (Lease #: {{LEASE_NUMBER}})

1. PARTIES:
This Lease Agreement is made between {{LANDLORD_NAME}} ("Landlord") and {{TENANT_NAMES}} ("Tenant").

2. PROPERTY & LEASED PREMISES:
Landlord leases to Tenant the following property and specified room(s):
{{PROPERTY_NAME}}
{{PROPERTY_ADDRESS}}

{{ROOMS_LIST}}

3. TERM:
The term of this lease shall be from {{LEASE_START}} to {{LEASE_END}}.

4. RENT:
The total combined monthly rent for the property/leased room(s) is \${{RENT_AMOUNT}}, payable on the first day of each month.

5. SECURITY DEPOSIT:
Tenant shall provide a security deposit of \${{SECURITY_DEPOSIT}} to be held by Landlord.

6. SIGNATURES:

Landlord Signature: ____________________ Date: __________

Tenant Signature: ____________________ Date: __________
`;

const LeaseGeneratorModal: React.FC<LeaseGeneratorModalProps> = ({ 
    isOpen, 
    onClose, 
    property, 
    lease, 
    multiRooms, 
    tenantNameOverride 
}) => {
    const { user } = useAuth();
    const { leaseTemplates, addLeaseTemplate, updateLeaseTemplate, deleteLeaseTemplate } = useAppContext();
    
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
    const [editMode, setEditMode] = useState(false);
    const [templateName, setTemplateName] = useState('My Custom Template');
    const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATE);

    // Track room selections for multi-room leases
    const [activeRoomIds, setActiveRoomIds] = useState<string[]>(
        multiRooms ? multiRooms.map(r => r.id) : []
    );

    const toggleRoomSelection = (roomId: string) => {
        if (activeRoomIds.includes(roomId)) {
            if (activeRoomIds.length <= 1) return; // Keep at least one room
            setActiveRoomIds(prev => prev.filter(id => id !== roomId));
        } else {
            setActiveRoomIds(prev => [...prev, roomId]);
        }
    };

    const currentTemplate = useMemo(() => {
        if (selectedTemplateId === 'default') return DEFAULT_TEMPLATE;
        return leaseTemplates.find(t => t.id === selectedTemplateId)?.content || DEFAULT_TEMPLATE;
    }, [selectedTemplateId, leaseTemplates]);

    const populatedLease = useMemo(() => {
        const tenantNames = tenantNameOverride 
            || (lease.tenants && lease.tenants.length > 0 ? lease.tenants.map(t => t.name).join(', ') : 'N/A');
        const landlordName = user?.companyName || user?.name || 'Owner';
        
        const isMultiRoom = multiRooms && multiRooms.length > 0;
        const selectedRooms = isMultiRoom 
            ? (property.rooms || []).filter(r => activeRoomIds.includes(r.id))
            : [];

        // Find single room if not multi-room
        const room = !isMultiRoom && lease.roomId && property.rooms ? property.rooms.find(r => r.id === lease.roomId) : null;
        
        let pName = property.name;
        if (isMultiRoom && selectedRooms.length > 0) {
            pName = `${property.name} (${selectedRooms.length} Leased Rooms)`;
        } else if (room) {
            pName = `${property.name} - Room: ${room.title} (${room.type})`;
        }
        
        let secDep = 0;
        let rentAmt = 0;

        if (isMultiRoom && selectedRooms.length > 0) {
            rentAmt = selectedRooms.reduce((sum, r) => sum + (r.rentAmount || 0), 0);
            secDep = selectedRooms.reduce((sum, r) => sum + (r.securityDeposit || 0), 0);
        } else {
            secDep = lease.securityDeposit !== undefined 
                ? lease.securityDeposit 
                : (room?.securityDeposit !== undefined ? room.securityDeposit : property.securityDeposit);
                
            rentAmt = lease.rentAmount !== undefined
                ? lease.rentAmount
                : (room?.rentAmount !== undefined ? room.rentAmount : property.rentAmount);
        }
            
        let leaseNo = lease.leaseNumber || room?.leaseNumber || 'N/A';
        if (isMultiRoom && selectedRooms.length > 0) {
            const roomLeaseNos = selectedRooms.map(r => r.leaseNumber).filter(Boolean);
            if (roomLeaseNos.length > 0) {
                leaseNo = roomLeaseNos.join(', ');
            }
        }

        // Generate rooms breakdown text
        let roomsListFormatted = '';
        if (isMultiRoom && selectedRooms.length > 0) {
            roomsListFormatted = `SPECIFIC ROOMS / UNITS INCLUDED ON THIS LEASE AGREEMENT (${selectedRooms.length} Total):\n` +
                `--------------------------------------------------\n` +
                selectedRooms.map((r, idx) => 
                    `${idx + 1}. Room/Unit: ${r.title} (${r.type})\n` +
                    `   • Size: ${r.squareFootage} sq ft | Max Guests: ${r.maxOccupancy}\n` +
                    `   • Monthly Rent: $${r.rentAmount || 0} USD\n` +
                    `   • Security Deposit: $${r.securityDeposit || 0} USD\n` +
                    `   • Lease Reference #: ${r.leaseNumber || 'N/A'}`
                ).join('\n\n') +
                `\n--------------------------------------------------\n` +
                `Combined Monthly Rent: $${rentAmt.toFixed(2)} USD\n` +
                `Combined Security Deposit: $${secDep.toFixed(2)} USD`;
        } else if (room) {
            roomsListFormatted = `Unit/Room: ${room.title} (${room.type}, ${room.squareFootage} sq ft)`;
        } else {
            roomsListFormatted = `Entire Property Premises`;
        }
        
        let content = currentTemplate;
        content = content.replace(/\{\{LANDLORD_NAME\}\}/g, landlordName);
        content = content.replace(/\{\{TENANT_NAMES\}\}/g, tenantNames);
        content = content.replace(/\{\{PROPERTY_NAME\}\}/g, pName);
        content = content.replace(/\{\{PROPERTY_ADDRESS\}\}/g, property.address);
        content = content.replace(/\{\{LEASE_START\}\}/g, formatDate(lease.leaseStart));
        content = content.replace(/\{\{LEASE_END\}\}/g, formatDate(lease.leaseEnd));
        content = content.replace(/\{\{RENT_AMOUNT\}\}/g, rentAmt.toString());
        content = content.replace(/\{\{SECURITY_DEPOSIT\}\}/g, secDep.toString());
        content = content.replace(/\{\{LEASE_NUMBER\}\}/g, leaseNo);

        if (content.includes('{{ROOMS_LIST}}')) {
            content = content.replace(/\{\{ROOMS_LIST\}\}/g, roomsListFormatted);
        } else if (isMultiRoom && selectedRooms.length > 0) {
            // If template lacks placeholder, append breakdown under property address
            content = content.replace(property.address, `${property.address}\n\n${roomsListFormatted}`);
        }
        
        return content;
    }, [currentTemplate, property, lease, user, multiRooms, activeRoomIds, tenantNameOverride]);

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
                const logoSize = 15; // Even smaller for real estate purposes
                doc.addImage(user.companyLogo, format, pageWidth - margin - logoSize, cursorY, logoSize, logoSize);
                cursorY += logoSize + 5; // Move cursor down after logo, smaller gap
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

                    {multiRooms && multiRooms.length > 0 && (
                        <div className="mb-3 p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl flex-shrink-0 space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                                    <BuildingOfficeIcon className="w-4 h-4 text-indigo-600" />
                                    Multi-Room Single Lease for: <strong className="text-indigo-950">{tenantNameOverride || 'Tenant'}</strong>
                                </span>
                                <span className="font-semibold text-indigo-700 text-[11px]">
                                    {activeRoomIds.length} of {multiRooms.length} room(s) included
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {multiRooms.map(r => {
                                    const isSelected = activeRoomIds.includes(r.id);
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => toggleRoomSelection(r.id)}
                                            className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                                                isSelected 
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                                            }`}
                                        >
                                            <span>{isSelected ? '✓' : '+'}</span>
                                            <span>{r.title}</span>
                                            <span className="text-[10px] opacity-80">(${r.rentAmount || 0}/mo)</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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
                                            <div className="flex justify-end mb-4">
                                                <img src={user.companyLogo} className="w-16 h-16 object-contain" alt="Company Logo" />
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
