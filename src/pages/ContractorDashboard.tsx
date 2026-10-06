import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Settings, 
  LogOut, 
  Briefcase, 
  CheckCircle, 
  FileText, 
  TrendingUp, 
  Clock, 
  Send,
  Award,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileCheck,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  ExternalLink,
  Info,
  Camera,
  Loader2,
  Trash2,
  Package,
  Upload
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ProjectRFQ, EPCBid } from '../types/rfq.js';
import { Organization } from '../types/organization.js';
import { EnergyProject } from '../types/project.js';
import { RFQDocumentsManager } from '../components/rfq/RFQDocumentsManager.js';
import { BidDocumentsManager } from '../components/rfq/BidDocumentsManager.js';
import { rfqDocumentClient, executeBidSubmissionWorkflow } from '../services/rfqDocumentClient.js';
import { validateClientFile, formatFileSize } from '../utils/documentPresentation.js';
import { formatCurrencyIRR, formatJalaliDate, formatPersianNumber, formatSolarCapacity } from '../utils/formatters.js';
import {
  uploadPartnerMedia,
  getContractorProfile,
  updateContractorProfile,
  createContractorPortfolioProject,
  updateContractorPortfolioProject,
  deleteContractorPortfolioProject,
  createContractorProduct,
  updateContractorProduct,
  deleteContractorProduct,
  EpcContractorProfile,
  EpcPortfolioProject
} from '../services/partnerMediaService.js';
import { useToast } from '../context/ToastContext.js';
import { PersianConfirmModal } from '../components/common/PersianConfirmModal.js';

export interface ContractorDashboardProps {
  previewMode?: boolean;
  initialRfqs?: ProjectRFQ[];
  initialBids?: EPCBid[];
  initialProjects?: EnergyProject[];
  initialOrgs?: Organization[];
  initialActiveTab?: 'rfqs' | 'my_bids' | 'awarded' | 'overview' | 'settings' | 'portfolio';
}

export default function ContractorDashboard({
  previewMode = false,
  initialRfqs,
  initialBids,
  initialProjects,
  initialOrgs,
  initialActiveTab = 'rfqs'
}: ContractorDashboardProps = {}) {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'rfqs' | 'my_bids' | 'awarded' | 'overview' | 'settings' | 'portfolio'>(initialActiveTab);
  const [requests, setRequests] = useState<any[]>([]);

  // Delete confirm modal state
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {}
  });

  // RFQ & Bidding State
  const [openRfqs, setOpenRfqs] = useState<ProjectRFQ[]>(initialRfqs || []);
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [epcOrgs, setEpcOrgs] = useState<Organization[]>(initialOrgs || []);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(initialOrgs?.[0]?.id || 'org_epc_001');
  const [myBids, setMyBids] = useState<EPCBid[]>(initialBids || []);
  const [contractorProjects, setContractorProjects] = useState<EnergyProject[]>(initialProjects || []);
  
  // Submit Bid Modal
  const [biddingRfq, setBiddingRfq] = useState<ProjectRFQ | null>(null);
  const [bidPriceToman, setBidPriceToman] = useState<number>(350); // in Million Toman
  const [bidYieldMwh, setBidYieldMwh] = useState<number>(180);
  const [bidTimelineDays, setBidTimelineDays] = useState<number>(60);
  const [bidWarrantyYears, setBidWarrantyYears] = useState<number>(5);
  const [panelBrand, setPanelBrand] = useState('Longi Solar 550W Tier 1');
  const [inverterBrand, setInverterBrand] = useState('Sungrow String Inverter');
  const [rackingType, setRackingType] = useState('گالوانیزه گرم مقاوم در برابر باد ۱۲۰ کیلومتر');
  const [monitoringIncluded, setMonitoringIncluded] = useState(true);
  const [bidNotes, setBidNotes] = useState('تجهیزات طبق آخرین استانداردهای فنی مهندسی با گارانتی تعویض و بیمه مسئولیت تحویل خواهد شد.');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Secure Documents UI State
  const [expandedRfqDocsId, setExpandedRfqDocsId] = useState<string | null>(null);
  const [expandedBidDocsId, setExpandedBidDocsId] = useState<string | null>(null);
  const [selectedTechFiles, setSelectedTechFiles] = useState<File[]>([]);
  const [selectedCommFiles, setSelectedCommFiles] = useState<File[]>([]);
  const [bidStep, setBidStep] = useState<number>(1);

  // Revise Bid Modal
  const [revisingBid, setRevisingBid] = useState<EPCBid | null>(null);
  const [revisePriceToman, setRevisePriceToman] = useState<number>(330);
  const [reviseYieldMwh, setReviseYieldMwh] = useState<number>(185);
  const [reviseTimelineDays, setReviseTimelineDays] = useState<number>(55);
  const [reviseWarrantyYears, setReviseWarrantyYears] = useState<number>(7);
  const [reviseReason, setReviseReason] = useState('تخفیف ویژه مهندسی و ارتقای دوره گارانتی');

  // Portfolio & Media State
  const [contractorProfile, setContractorProfile] = useState<EpcContractorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<EpcPortfolioProject | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectType, setProjectType] = useState('نیروگاهی');
  const [projectProvince, setProjectProvince] = useState('');
  const [projectCity, setProjectCity] = useState('');
  const [projectCapacity, setProjectCapacity] = useState('');
  const [projectYear, setProjectYear] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [uploadingProjectImage, setUploadingProjectImage] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);

  // Contractor Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingContractorProduct, setEditingContractorProduct] = useState<any | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('پنل خورشیدی');
  const [prodBrand, setProdBrand] = useState('');
  const [prodModel, setProdModel] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [uploadingProdImage, setUploadingProdImage] = useState(false);
  const [submittingProd, setSubmittingProd] = useState(false);

  const loadContractorProfileData = async () => {
    try {
      setLoadingProfile(true);
      const data = await getContractorProfile();
      setContractorProfile(data);
    } catch (e) {
      console.error('Failed to load contractor profile:', e);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'portfolio') {
      loadContractorProfileData();
    }
  }, [activeTab]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const res = await uploadPartnerMedia(file, 'EPC_LOGO');
      const updated = await updateContractorProfile({
        logoKey: res.storageKey,
        logoUrl: res.downloadUrl
      });
      setContractorProfile(updated);
      showSuccess('لوگوی شرکت با موفقیت در فضای ذخیره‌سازی ابری بارگذاری شد.', 'بارگذاری موفق');
    } catch (err: any) {
      showError(err.message || 'خطا در بارگذاری لوگو.', 'خطای بارگذاری');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleOpenAddProject = () => {
    setEditingProject(null);
    setProjectTitle('');
    setProjectType('نیروگاهی');
    setProjectProvince('');
    setProjectCity('');
    setProjectCapacity('');
    setProjectYear('');
    setProjectDesc('');
    setProjectImages([]);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: EpcPortfolioProject) => {
    setEditingProject(proj);
    setProjectTitle(proj.title);
    setProjectType(proj.projectType);
    setProjectProvince(proj.province || '');
    setProjectCity(proj.city || '');
    setProjectCapacity(proj.installedCapacityKw ? String(proj.installedCapacityKw) : '');
    setProjectYear(proj.completionYear ? String(proj.completionYear) : '');
    setProjectDesc(proj.description || '');
    setProjectImages(Array.isArray(proj.images) ? proj.images : []);
    setIsProjectModalOpen(true);
  };

  const handleUploadProjectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProjectImage(true);
      const res = await uploadPartnerMedia(file, 'EPC_PORTFOLIO');
      setProjectImages(prev => [res.downloadUrl, ...prev]);
      showSuccess('تصویر پروژه با موفقیت بارگذاری شد.', 'بارگذاری موفق');
    } catch (err: any) {
      showError(err.message || 'خطا در بارگذاری تصویر پروژه.', 'خطای بارگذاری');
    } finally {
      setUploadingProjectImage(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle) return;

    try {
      setSubmittingProject(true);
      const payload = {
        title: projectTitle,
        projectType,
        province: projectProvince,
        city: projectCity,
        installedCapacityKw: projectCapacity ? Number(projectCapacity) : null,
        completionYear: projectYear,
        description: projectDesc,
        images: projectImages
      };

      if (editingProject) {
        await updateContractorPortfolioProject(editingProject.id, payload);
        showSuccess('اطلاعات نمونه‌پروژه با موفقیت به‌روزرسانی شد.', 'ویرایش موفق');
      } else {
        await createContractorPortfolioProject(payload);
        showSuccess('نمونه‌پروژه جدید با موفقیت ثبت شد.', 'ثبت پروژه');
      }

      await loadContractorProfileData();
      setIsProjectModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'خطا در ثبت نمونه‌پروژه.', 'خطای عملیات');
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleDeleteProject = (projId: string) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'حذف نمونه‌پروژه',
      message: 'آیا از حذف این نمونه‌پروژه اطمینان دارید؟ این عمل غیرقابل بازگشت است.',
      onConfirm: async () => {
        try {
          await deleteContractorPortfolioProject(projId);
          await loadContractorProfileData();
          showSuccess('نمونه‌پروژه با موفقیت حذف شد.', 'حذف موفق');
        } catch (err: any) {
          showError(err.message || 'خطا در حذف پروژه.', 'خطای عملیات');
        } finally {
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleOpenAddProduct = () => {
    setEditingContractorProduct(null);
    setProdName('');
    setProdCategory('پنل خورشیدی');
    setProdBrand('');
    setProdModel('');
    setProdPrice('');
    setProdDesc('');
    setProdImages([]);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: any) => {
    setEditingContractorProduct(prod);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdBrand(prod.brand || '');
    setProdModel(prod.model || '');
    setProdPrice(prod.price ? String(prod.price) : '');
    setProdDesc(prod.description || '');
    setProdImages(Array.isArray(prod.images) ? prod.images : []);
    setIsProductModalOpen(true);
  };

  const handleUploadProdImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProdImage(true);
      const res = await uploadPartnerMedia(file, 'EPC_PRODUCT');
      setProdImages(prev => [res.downloadUrl, ...prev]);
      showSuccess('تصویر تجهیز با موفقیت بارگذاری شد.', 'بارگذاری موفق');
    } catch (err: any) {
      showError(err.message || 'خطا در بارگذاری تصویر تجهیز.', 'خطای بارگذاری');
    } finally {
      setUploadingProdImage(false);
    }
  };

  const handleSaveContractorProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName) return;

    try {
      setSubmittingProd(true);
      const payload = {
        name: prodName,
        category: prodCategory,
        brand: prodBrand,
        model: prodModel,
        price: prodPrice ? Number(prodPrice) : undefined,
        description: prodDesc,
        images: prodImages
      };

      if (editingContractorProduct) {
        await updateContractorProduct(editingContractorProduct.id, payload);
        showSuccess('اطلاعات تجهیز با موفقیت به‌روزرسانی شد.', 'ویرایش موفق');
      } else {
        await createContractorProduct(payload);
        showSuccess('تجهیز جدید با موفقیت اضافه شد.', 'ثبت تجهیز');
      }

      await loadContractorProfileData();
      setIsProductModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'خطا در ذخیره تجهیز.', 'خطای عملیات');
    } finally {
      setSubmittingProd(false);
    }
  };

  const handleDeleteContractorProduct = (prodId: string) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'حذف تجهیز',
      message: 'آیا از حذف این تجهیز اطمینان دارید؟ این عمل غیرقابل بازگشت است.',
      onConfirm: async () => {
        try {
          await deleteContractorProduct(prodId);
          await loadContractorProfileData();
          showSuccess('تجهیز با موفقیت حذف شد.', 'حذف موفق');
        } catch (err: any) {
          showError(err.message || 'خطا در حذف تجهیز.', 'خطای عملیات');
        } finally {
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  useEffect(() => {
    if (previewMode) {
      if (initialRfqs) setOpenRfqs(initialRfqs);
      if (initialBids) setMyBids(initialBids);
      if (initialProjects) setContractorProjects(initialProjects);
      if (initialOrgs && initialOrgs.length > 0) {
        setEpcOrgs(initialOrgs);
        setSelectedOrgId(initialOrgs[0].id);
      }
      return;
    }

    // 1. Legacy local requests
    try {
      const stored = localStorage.getItem('epc_requests');
      if (stored) {
        setRequests(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Load open RFQs and EPC organizations
    loadEpcData();
  }, [previewMode, initialRfqs, initialBids, initialProjects, initialOrgs]);

  const loadEpcData = async () => {
    setLoadingRfqs(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch open RFQs
      const rfqRes = await fetch('/api/rfq/opportunities/open', { headers });
      if (rfqRes.ok) {
        const rfqs = await rfqRes.json();
        setOpenRfqs(Array.isArray(rfqs) ? rfqs : []);
      }

      // Fetch contractor's submitted bids
      const bidsRes = await fetch('/api/rfq/bids/my', { headers });
      if (bidsRes.ok) {
        const bids = await bidsRes.json();
        setMyBids(Array.isArray(bids) ? bids : []);
      }

      // Fetch contractor's assigned/membered projects
      const prjRes = await fetch('/api/projects', { headers });
      if (prjRes.ok) {
        const prjs = await prjRes.json();
        setContractorProjects(Array.isArray(prjs) ? prjs : []);
      }

      // Fetch verified EPC orgs
      const orgRes = await fetch('/api/rfq/organizations/epc', { headers });
      if (orgRes.ok) {
        const orgs = await orgRes.json();
        setEpcOrgs(Array.isArray(orgs) ? orgs : []);
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading EPC data', err);
    } finally {
      setLoadingRfqs(false);
    }
  };

  const handleOpenBidModal = (rfq: ProjectRFQ) => {
    setBiddingRfq(rfq);
    setBidStep(1);
    setSelectedTechFiles([]);
    setSelectedCommFiles([]);
    if (rfq.commercialTerms?.minWarrantyYears) {
      setBidWarrantyYears(rfq.commercialTerms.minWarrantyYears);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biddingRfq) return;

    setSubmittingBid(true);
    setFeedbackMessage(null);
    try {
      if (previewMode) {
        const simulatedBid: EPCBid = {
          id: `bid_preview_${Date.now()}`,
          bidCode: `BID-HSE-PREV-${Math.floor(1000 + Math.random() * 9000)}`,
          rfqId: biddingRfq.id,
          projectId: biddingRfq.projectId,
          epcOrganizationId: selectedOrgId,
          totalPrice: Number(bidPriceToman) * 10000000,
          proposedPriceIRR: Number(bidPriceToman) * 10000000,
          currency: 'IRR',
          guaranteedAnnualYieldMwh: Number(bidYieldMwh),
          timelineDays: Number(bidTimelineDays),
          warrantyYears: Number(bidWarrantyYears),
          status: 'SUBMITTED',
          equipmentSummary: {
            panels: panelBrand,
            inverters: inverterBrand,
          },
          equipmentSpecs: {
            panelBrand,
            inverterBrand,
            rackingType,
            monitoringIncluded
          },
          createdAt: new Date().toISOString(),
          submittedAt: new Date().toISOString()
        } as any;
        setMyBids(prev => [simulatedBid, ...prev]);
        setBiddingRfq(null);
        setSelectedTechFiles([]);
        setSelectedCommFiles([]);
        setFeedbackMessage({ type: 'success', text: 'پیشنهاد با موفقیت در محیط پیش‌نمایش ثبت شد.' });
        setActiveTab('my_bids');
        setSubmittingBid(false);
        return;
      }

      const token = localStorage.getItem('token');
      const payload = {
        epcOrganizationId: selectedOrgId,
        proposedPriceIRR: Number(bidPriceToman) * 10000000, // Toman to IRR
        guaranteedAnnualYieldMwh: Number(bidYieldMwh),
        timelineDays: Number(bidTimelineDays),
        warrantyYears: Number(bidWarrantyYears),
        equipmentSpecs: {
          panelBrand,
          inverterBrand,
          rackingType,
          monitoringIncluded
        },
        paymentTerms: '۲۰٪ پیش‌پرداخت، ۶۰٪ متناسب با تحویل تجهیزات، ۲۰٪ پس از راه‌اندازی و اتصال به شبکه',
        notes: bidNotes
      };

      const result = await executeBidSubmissionWorkflow({
        rfqId: biddingRfq.id,
        bidPayload: payload,
        techFiles: selectedTechFiles,
        commFiles: selectedCommFiles,
        createBidApi: async (rfqId, body) => {
          const res = await fetch(`/api/rfq/${rfqId}/bids`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body)
          });
          const data = await res.json();
          return {
            ok: res.ok,
            status: res.status,
            data: res.ok ? data : undefined,
            error: !res.ok ? data?.error : undefined
          };
        },
        uploadBidDocApi: (rfqId, bidId, cat, file) => rfqDocumentClient.uploadBidDocument(rfqId, bidId, cat, file)
      });

      if (result.bidCreated) {
        await loadEpcData();
        setBiddingRfq(null);
        setSelectedTechFiles([]);
        setSelectedCommFiles([]);
        setFeedbackMessage(result.feedbackMessage);
        setActiveTab('my_bids');
      } else {
        setFeedbackMessage(result.feedbackMessage);
      }
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleOpenReviseModal = (bid: EPCBid) => {
    setRevisingBid(bid);
    setRevisePriceToman(Math.round(bid.proposedPriceIRR / 10000000));
    setReviseYieldMwh(bid.guaranteedAnnualYieldMwh);
    setReviseTimelineDays(bid.timelineDays);
    setReviseWarrantyYears(bid.warrantyYears);
  };

  const handleReviseBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingBid) return;

    setSubmittingBid(true);
    setFeedbackMessage(null);
    try {
      if (previewMode) {
        setMyBids(prev => prev.map(b => b.id === revisingBid.id ? {
          ...b,
          proposedPriceIRR: Number(revisePriceToman) * 10000000,
          guaranteedAnnualYieldMwh: Number(reviseYieldMwh),
          timelineDays: Number(reviseTimelineDays),
          warrantyYears: Number(reviseWarrantyYears)
        } : b));
        setRevisingBid(null);
        setFeedbackMessage({
          type: 'success',
          text: `نسخه اصلاحیه پیشنهاد در محیط پیش‌نمایش ثبت شد.`
        });
        setSubmittingBid(false);
        return;
      }

      const token = localStorage.getItem('token');
      const payload = {
        proposedPriceIRR: Number(revisePriceToman) * 10000000,
        guaranteedAnnualYieldMwh: Number(reviseYieldMwh),
        timelineDays: Number(reviseTimelineDays),
        warrantyYears: Number(reviseWarrantyYears),
        reasonForRevision: reviseReason
      };

      const res = await fetch(`/api/rfq/bids/${revisingBid.id}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedBid = await res.json();
        setMyBids(prev => prev.map(b => b.id === updatedBid.id ? updatedBid : b));
        setRevisingBid(null);
        setFeedbackMessage({
          type: 'success',
          text: `نسخه اصلاحیه پیشنهاد ${updatedBid.bidCode} با موفقیت ثبت شد.`
        });
      } else {
        const err = await res.json();
        setFeedbackMessage({ type: 'error', text: err.error || 'خطا در ارسال اصلاحیه' });
      }
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setSubmittingBid(false);
    }
  };

  const currentOrg = epcOrgs.find(o => o.id === selectedOrgId) || epcOrgs[0];

  // Awarded projects filter: bids accepted by customer or assigned projects in execution phases
  const awardedBids = myBids.filter(b => b.status === 'ACCEPTED');
  const awardedProjects = contractorProjects.filter(p => 
    ['EPC_SELECTED', 'EPC_CONTRACT', 'INSTALLATION', 'IN_PROGRESS'].includes(p.status) ||
    awardedBids.some(b => b.projectId === p.id)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'SELECTED':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 size={13} /> مجری منتخب (پروژه واگذارشده)
          </span>
        );
      case 'SHORTLISTED':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            فهرست کوتاه
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            در حال ارزیابی کارفرما
          </span>
        );
      case 'REJECTED':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
            عدم پذیرش پیشنهاد
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-500">
            انصراف داده
          </span>
        );
      case 'SUBMITTED':
      default:
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            ثبت شده
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans flex flex-col md:flex-row pb-20 md:pb-0 text-slate-800 dark:text-slate-100" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. SIDEBAR NAVIGATION — Stage 13.6 Energy Blue Enterprise Palette        */}
      {/* ========================================================================= */}
      <aside 
        aria-label="منوی اصلی پیمانکار EPC"
        className="w-full md:w-64 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 p-5 flex flex-col hidden md:flex shrink-0 min-h-screen sticky top-0 shadow-xs z-30"
      >
        {/* Company Identity Header */}
        <div className="flex flex-col items-center mb-6 border-b border-slate-100 dark:border-zinc-800 pb-5">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/50 text-[#0284C7] rounded-2xl flex items-center justify-center mb-3 shadow-xs border border-blue-100 dark:border-blue-900/40">
            <Building2 size={28} />
          </div>
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 text-center leading-snug">
            {currentOrg?.tradeName || currentOrg?.legalName || 'شرکت پیمانکار EPC'}
          </h2>
          <div className="mt-2 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            مجری احراز صلاحیت شده
          </div>
        </div>

        {/* EPC Profile Selector if multiple orgs exist */}
        {epcOrgs.length > 1 && (
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">پروفایل فعال EPC:</label>
            <select 
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2 outline-none"
            >
              {epcOrgs.map(org => (
                <option key={org.id} value={org.id}>
                  {org.tradeName || org.legalName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1.5 flex-1">
          <button 
            type="button"
            onClick={() => setActiveTab('rfqs')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'rfqs' 
                ? 'bg-[#0284C7] text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Zap size={18} />
            <span>فرصت‌های استعلام (RFQ)</span>
            {openRfqs.length > 0 && (
              <span className={`mr-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'rfqs' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              }`}>
                {openRfqs.length}
              </span>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('my_bids')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'my_bids' 
                ? 'bg-[#0284C7] text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Award size={18} />
            <span>پیشنهادهای ارسالی من</span>
            {myBids.length > 0 && (
              <span className={`mr-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'my_bids' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-slate-300'
              }`}>
                {myBids.length}
              </span>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('awarded')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'awarded' 
                ? 'bg-[#0284C7] text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Briefcase size={18} />
            <span>پروژه‌های واگذارشده</span>
            {awardedProjects.length > 0 && (
              <span className={`mr-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'awarded' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}>
                {awardedProjects.length}
              </span>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'overview' 
                ? 'bg-[#0284C7] text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <TrendingUp size={18} />
            <span>داشبورد و آمار تجمیعی</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'portfolio' 
                ? 'bg-[#0284C7] text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Building2 size={18} />
            <span>پروفایل و سبد پروژه‌ها</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'settings' 
                ? 'bg-[#0284C7] text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Settings size={18} />
            <span>تنظیمات و مدارک شرکت</span>
          </button>
        </nav>

        {/* Footer Utilities */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-2">
          <Link 
            to="/target-select" 
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors text-xs min-h-[44px]"
          >
            تحلیل مهندسی خورشیدی
          </Link>
          <button 
            type="button"
            onClick={() => { localStorage.removeItem('token'); window.location.href = '/'; }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-bold transition-colors text-xs min-h-[44px] cursor-pointer"
          >
            <LogOut size={16} />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA                                                     */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* Mobile Navigation Header */}
        <div className="md:hidden flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">ورک‌اسپیس رسمی پیمانکار</span>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
              {currentOrg?.tradeName || currentOrg?.legalName || 'پیمانکار رسمی EPC'}
            </h2>
          </div>
          {currentOrg?.verificationStatus === 'VERIFIED' ? (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-600" />
              معتبر و تأییدشده
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <Clock size={13} className="text-amber-600" />
              در انتظار بررسی
            </span>
          )}
        </div>

        {/* Mobile Sub-tabs Navigation (RTL scroll-safe, no viewport clipping at 320px/360px/375px/390px/430px) */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto pb-2 mb-4 flex items-center gap-2 no-scrollbar touch-pan-x scroll-smooth">
          <button
            type="button"
            onClick={() => setActiveTab('rfqs')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'rfqs' ? 'bg-[#0284C7] text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
            }`}
          >
            مناقصات RFQ ({openRfqs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my_bids')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'my_bids' ? 'bg-[#0284C7] text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
            }`}
          >
            پیشنهادهای من ({myBids.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('awarded')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'awarded' ? 'bg-[#0284C7] text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
            }`}
          >
            پروژه‌ها ({awardedProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'bg-[#0284C7] text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
            }`}
          >
            آمار تجمیعی
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'portfolio' ? 'bg-[#0284C7] text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
            }`}
          >
            پروفایل و پروژه‌ها
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'settings' ? 'bg-[#0284C7] text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
            }`}
          >
            صلاحیت شرکت
          </button>
        </div>

        {/* Action / Attention Center (Header Operational Summary) */}
        <section aria-label="مرکز اولویت‌های عملیاتی پیمانکار" className="mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">فرصت‌های استعلام</span>
                <span className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300">
                  {openRfqs.length} <span className="text-xs font-normal text-slate-400">مورد باز</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] flex items-center justify-center shrink-0">
                <Zap size={20} />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">پیشنهادهای ارسالی</span>
                <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-200">
                  {myBids.length} <span className="text-xs font-normal text-slate-400">پیشنهاد</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-600 flex items-center justify-center shrink-0">
                <Award size={20} />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">پروژه‌های واگذارشده</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {awardedProjects.length} <span className="text-xs font-normal text-slate-400">قرارداد</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                <Briefcase size={20} />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">وضعیت احراز هویت</span>
                <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300">
                  {currentOrg?.verificationStatus === 'VERIFIED' ? 'معتبر و تأییدشده' : 'در انتظار بررسی'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>
        </section>

        {/* Feedback Messages */}
        {feedbackMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border mb-6 ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
          }`}>
            {feedbackMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
            <span className="text-sm font-bold">{feedbackMessage.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: RFQ OPPORTUNITIES                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'rfqs' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between gap-4 pb-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  صندوق فرصت‌های استعلام و مناقصات EPC
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  استعلام‌های رسمی کارفرمایان جهت انتخاب مجری رسمی پروژه نیروگاهی
                </p>
              </div>
            </div>

            {loadingRfqs ? (
              <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center font-bold text-slate-500">
                در حال دریافت مناقصات باز...
              </div>
            ) : openRfqs.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center py-16 shadow-xs">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Zap size={32} />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mb-1">
                  در حال حاضر استعلام فعالی برای شما وجود ندارد.
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  به محض انتشار استعلام جدید نیروگاهی منطبق با حوزه فعالیت شرکت شما، فرصت‌های احداث در این بخش قرار می‌گیرند.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {openRfqs.map((rfq) => {
                  const deadlineDate = rfq.submissionDeadline ? formatJalaliDate(rfq.submissionDeadline) : 'مشخص نشده';
                  const isExpandedDocs = expandedRfqDocsId === rfq.id;

                  return (
                    <div 
                      key={rfq.id} 
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs hover:border-blue-200 dark:hover:border-zinc-700 transition-all space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span dir="ltr" className="font-mono text-xs font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
                              {rfq.rfqCode}
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              استعلام فعال
                            </span>
                            {(rfq as any).systemCapacityKw && (
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded">
                                ظرفیت درخواستی: {formatSolarCapacity((rfq as any).systemCapacityKw)}
                              </span>
                            )}
                          </div>

                          <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                            {rfq.title}
                          </h4>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                            {rfq.scopeDescription || rfq.description || 'احداث و اجرای کامل نیروگاه متصل به شبکه.'}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={14} className="text-slate-400" />
                              مهلت ارسال پیشنهاد: <strong>{deadlineDate}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <ShieldCheck size={14} className="text-emerald-500" />
                              حداقل گارانتی الزامی: <strong>{rfq.commercialTerms?.minWarrantyYears || 5} سال</strong>
                            </span>
                            {(rfq as any).location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={14} className="text-blue-500" />
                                موقعیت: <strong>{(rfq as any).location}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-row md:flex-col items-center md:items-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-zinc-800">
                          <button 
                            type="button"
                            onClick={() => handleOpenBidModal(rfq)}
                            className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 min-h-[44px] cursor-pointer w-full sm:w-auto"
                          >
                            <Send size={15} />
                            <span>مشاهده استعلام و ارسال پیشنهاد</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedRfqDocsId(isExpandedDocs ? null : rfq.id)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[44px] cursor-pointer w-full sm:w-auto"
                          >
                            <FileText size={15} />
                            <span>{isExpandedDocs ? 'بستن اسناد' : 'اسناد و مدارک استعلام'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable RFQ Documents Viewer */}
                      {isExpandedDocs && (
                        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                          <RFQDocumentsManager
                            rfqId={rfq.id}
                            isOwner={false}
                            requiredDocuments={rfq.requiredDocuments || []}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY SUBMITTED BIDS                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'my_bids' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between gap-4 pb-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  پیشنهادهای فنی و مالی ارسال‌شده توسط شرکت
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  پیگیری وضعیت بررسی توسط کارفرما، تکمیل اسناد و ثبت نسخه‌های اصلاحیه
                </p>
              </div>
            </div>

            {myBids.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center py-16 shadow-xs">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Award size={32} />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mb-1">
                  هنوز پیشنهادی ارسال نکرده‌اید.
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                  از تب «فرصت‌های استعلام (RFQ)»، مناقصات فعال را بررسی کرده و اولین پیشنهاد رقابتی خود را ارسال فرمایید.
                </p>
                <button 
                  type="button"
                  onClick={() => setActiveTab('rfqs')}
                  className="bg-[#0284C7] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#0369A1] transition-colors min-h-[44px]"
                >
                  مشاهده مناقصات فعال
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myBids.map((bid) => {
                  const priceToman = Math.round(bid.proposedPriceIRR / 10000000);
                  const isAccepted = bid.status === 'ACCEPTED';
                  const isExpandedDocs = expandedBidDocsId === bid.id;
                  const panel = bid.equipmentSpecs?.panelBrand || bid.equipmentSummary?.panels;
                  const inverter = bid.equipmentSpecs?.inverterBrand || bid.equipmentSummary?.inverters;

                  return (
                    <div 
                      key={bid.id} 
                      className={`bg-white dark:bg-zinc-900 rounded-2xl border p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                        isAccepted 
                          ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950/50' 
                          : 'border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span dir="ltr" className="font-mono text-xs font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
                              {bid.bidCode || bid.id.substring(0, 8)}
                            </span>
                            {getStatusBadge(bid.status)}
                            {bid.revisions && bid.revisions.length > 0 && (
                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                                اصلاحیه نسخه {bid.revisions.length + 1}
                              </span>
                            )}
                          </div>

                          <div className="pt-1">
                            <span className="text-xs text-slate-400 block">قیمت پیشنهادی پیمانکار:</span>
                            <h4 className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-300">
                              {formatPersianNumber(priceToman)} میلیون تومان
                              <span className="text-xs font-normal text-slate-400 mr-2">({formatCurrencyIRR(bid.proposedPriceIRR)} ریال)</span>
                            </h4>
                          </div>
                        </div>

                        {/* Revision & Documents Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {bid.status !== 'ACCEPTED' && bid.status !== 'REJECTED' && (
                            <button 
                              type="button"
                              onClick={() => handleOpenReviseModal(bid)}
                              className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors min-h-[44px] cursor-pointer"
                            >
                              <Edit3 size={15} />
                              <span>ارسال اصلاحیه پیشنهاد</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedBidDocsId(isExpandedDocs ? null : bid.id)}
                            className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-[#0284C7] dark:text-blue-300 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors min-h-[44px] cursor-pointer"
                          >
                            <FileText size={15} />
                            <span>{isExpandedDocs ? 'بستن اسناد' : 'اسناد پیوست پیشنهاد'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Truthful Metrics Attribution Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs border-b border-slate-100 dark:border-zinc-800">
                        <div>
                          <span className="text-slate-400 block mb-0.5">تولید سالیانه اعلامی پیمانکار:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {bid.guaranteedAnnualYieldMwh ? `${formatPersianNumber(bid.guaranteedAnnualYieldMwh)} MWh/سال` : 'ارائه نشده'}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-normal">ثبت‌شده توسط شرکت پیمانکار</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">مدت اجرای اعلام‌شده:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {bid.timelineDays ? `${formatPersianNumber(bid.timelineDays)} روز کاری` : 'ارائه نشده'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">مدت گارانتی پیشنهادی:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {bid.warrantyYears ? `${formatPersianNumber(bid.warrantyYears)} سال` : 'ارائه نشده'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">تجهیزات اعلامی:</span>
                          <div className="text-[11px] truncate">
                            {panel ? (
                              <span dir="ltr" className="font-mono font-bold text-slate-800 dark:text-slate-200">{panel}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">ثبت نشده</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Bid Documents Manager */}
                      {isExpandedDocs && (
                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                          <BidDocumentsManager
                            rfqId={bid.rfqId}
                            bidId={bid.id}
                            isBidOwner={true}
                            canModify={bid.status !== 'ACCEPTED' && bid.status !== 'REJECTED' && bid.status !== 'WITHDRAWN'}
                            legacyTechnical={bid.technicalDocuments || []}
                            legacyCommercial={bid.commercialDocuments || []}
                            onDocumentChange={loadEpcData}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AWARDED PROJECTS                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'awarded' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between gap-4 pb-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  پروژه‌های واگذارشده و قراردادهای EPC
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  پروژه‌هایی که پیشنهاد شما توسط کارفرما انتخاب گردیده و در فاز آماده‌سازی قرارداد یا احداث قرار دارند
                </p>
              </div>
            </div>

            {awardedProjects.length === 0 && awardedBids.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center py-16 shadow-xs">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Briefcase size={32} />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mb-1">
                  پس از واگذاری پروژه، اطلاعات آن در این بخش نمایش داده می‌شود.
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  هنگامی که کارفرما پیشنهاد شما را به عنوان مجری رسمی پروژه انتخاب فرماید، مدارک اتصال، قرارداد و دسترسی به اطلاعات سایت در این بخش فعال خواهد شد.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {awardedBids.map((bid) => {
                  const prj = contractorProjects.find(p => p.id === bid.projectId);
                  const priceToman = Math.round(bid.proposedPriceIRR / 10000000);

                  return (
                    <div 
                      key={`awarded-${bid.id}`}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-emerald-500 p-5 sm:p-6 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              پروژه واگذارشده به مجری منتخب (EPC)
                            </span>
                            <span dir="ltr" className="font-mono text-xs font-bold text-slate-500">
                              {bid.bidCode}
                            </span>
                          </div>
                          <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                            {prj?.title || 'پروژه نیروگاه خورشیدی متصل به شبکه'}
                          </h4>
                          <span className="text-xs text-slate-500">
                            مبلغ قرارداد پیشنهادی: <strong className="text-blue-700 dark:text-blue-300 font-bold">{formatPersianNumber(priceToman)} میلیون تومان</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/projects/${bid.projectId || 'demo'}`}
                            className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors min-h-[44px]"
                          >
                            <Eye size={15} />
                            <span>ورود به میز کار پروژه</span>
                          </Link>
                        </div>
                      </div>

                      {/* Next Operational Steps */}
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-4 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5">
                        <span className="font-bold block">اقدامات بعدی مجری رسمی:</span>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-900/80 dark:text-emerald-300/80">
                          <li>هماهنگی بازدید نهایی از محل پروژه و تحویل فیزیکی ساختگاه</li>
                          <li>مبادله پیش‌نویس قرارداد EPC و اخذ تاییدیه توانیر / شرکت توزیع برق مربوطه</li>
                          <li>ثبت اسناد نهایی تفکیکی تامین تجهیزات و جدول گنت اجرای پروژه</li>
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: OVERVIEW & AGGREGATE STATS                                        */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-6">روند ماهانه پیشنهادات و پروژه‌ها (شش ماه اخیر)</h4>
              {(() => {
                const past6Months = Array.from({ length: 6 }, (_, i) => {
                  const d = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - i), 1);
                  const jDate = new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(d);
                  return {
                    name: jDate,
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    projects: 0,
                    bids: 0
                  };
                });

                contractorProjects.forEach(p => {
                  const pDate = new Date(p.createdAt);
                  const match = past6Months.find(m => m.year === pDate.getFullYear() && m.month === pDate.getMonth());
                  if (match) match.projects += 1;
                });

                myBids.forEach(b => {
                  const bDate = new Date(b.submittedAt || b.createdAt);
                  const match = past6Months.find(m => m.year === bDate.getFullYear() && m.month === bDate.getMonth());
                  if (match) match.bids += 1;
                });

                const totalActivity = past6Months.reduce((sum, m) => sum + m.projects + m.bids, 0);

                if (totalActivity === 0) {
                  return (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl">
                      <TrendingUp size={32} className="text-slate-300" />
                      <p className="text-xs">هنوز داده‌های عملکردی برای نمایش نمودار ماهانه ثبت نشده است.</p>
                    </div>
                  );
                }

                return (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={past6Months}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" name="پیشنهادات ارسالی" dataKey="bids" stroke="#0284C7" fill="#e0f2fe" />
                        <Area type="monotone" name="پروژه‌های اجرایی" dataKey="projects" stroke="#10b981" fill="#d1fae5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4.5: PORTFOLIO & COMPANY MEDIA                                        */}
        {/* ========================================================================= */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {loadingProfile ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                <Loader2 className="animate-spin mx-auto mb-2 text-[#0284C7]" size={28} />
                در حال دریافت اطلاعات سبد پروژه‌ها و کاتالوگ...
              </div>
            ) : (
              <>
                {/* 1. Company Logo Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-zinc-800">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-50 dark:bg-zinc-800 border-2 border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 group">
                      {uploadingLogo ? (
                        <Loader2 className="animate-spin text-[#0284C7]" size={28} />
                      ) : contractorProfile?.logoUrl ? (
                        <img src={contractorProfile.logoUrl} alt="لوگوی شرکت" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Building2 size={44} className="text-slate-400" />
                      )}
                      <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold">
                        <Camera size={20} className="mb-1" />
                        <span>تغییر لوگو</span>
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp" 
                          className="hidden" 
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                      </label>
                    </div>

                    <div className="flex-1 text-center sm:text-right">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {contractorProfile?.tradeName || contractorProfile?.legalName || currentOrg?.tradeName || 'شرکت مهندسی EPC'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        لوگوی رسمی شرکت برای نمایش در استعلام‌های قیمت (RFQ)، مناقصات و نمایه عمومی
                      </p>
                      {currentOrg?.id && (
                        <div className="mt-3">
                          <Link
                            to={`/contractor/${currentOrg.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs text-[#0284C7] hover:underline font-bold"
                          >
                            <span>مشاهده نمایه عمومی پیمانکار</span>
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Project Portfolio Management */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Briefcase className="text-[#0284C7]" size={20} />
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        سبد نمونه‌پروژه‌های اجرا شده ({contractorProfile?.projectPortfolio?.length || 0})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddProject}
                      className="inline-flex items-center gap-1 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer min-h-[38px]"
                    >
                      <Plus size={15} />
                      <span>افزودن نمونه‌پروژه جدید</span>
                    </button>
                  </div>

                  {!contractorProfile?.projectPortfolio || contractorProfile.projectPortfolio.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      هنوز نمونه‌پروژه‌ای در این بخش ثبت نشده است. با افزودن پروژه‌های تکمیل‌شده همراه با تصاویر و مشخصات فنی، رتبه و امتیاز پذیرش پیشنهادات خود را افزایش دهید.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contractorProfile.projectPortfolio.map(proj => (
                        <div
                          key={proj.id}
                          className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-50 dark:bg-zinc-850/50 flex flex-col justify-between"
                        >
                          <div>
                            {proj.images?.[0] ? (
                              <div className="w-full h-40 overflow-hidden bg-slate-100 dark:bg-zinc-800 relative">
                                <img src={proj.images[0]} alt={proj.title} className="w-full h-full object-cover" />
                                <span className="absolute top-2 right-2 bg-white/95 dark:bg-zinc-900/95 text-slate-800 dark:text-slate-200 text-[10px] px-2 py-0.5 rounded font-bold">
                                  {proj.projectType}
                                </span>
                              </div>
                            ) : (
                              <div className="w-full h-28 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                                <Briefcase size={24} />
                              </div>
                            )}

                            <div className="p-4 space-y-2">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                {proj.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                {proj.installedCapacityKw && (
                                  <span className="font-bold text-[#0284C7]">
                                    ظرفیت: {formatPersianNumber(proj.installedCapacityKw)} کیلووات
                                  </span>
                                )}
                                {(proj.province || proj.city) && (
                                  <span>محل: {proj.province ? `${proj.province}، ` : ''}{proj.city || ''}</span>
                                )}
                                {proj.completionYear && (
                                  <span>سال: {proj.completionYear}</span>
                                )}
                              </div>
                              {proj.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                  {proj.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="p-4 pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProject(proj)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={14} />
                              <span>ویرایش</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(proj.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={14} />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Optional Products / Equipment Management */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Package className="text-amber-500" size={20} />
                      <div>
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                          تجهیزات و اقلام اختصاصی پیمانکار (اختیاری) ({contractorProfile?.products?.length || 0})
                        </h3>
                        <span className="text-[11px] text-slate-400">تجهیزاتی که شرکت شما به طور مستقیم در پروژه‌ها تأمین یا به فروش می‌رساند</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddProduct}
                      className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer min-h-[38px]"
                    >
                      <Plus size={15} />
                      <span>افزودن تجهیز اختیاری</span>
                    </button>
                  </div>

                  {!contractorProfile?.products || contractorProfile.products.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      هیچ تجهیز اختصاصی ثبت نشده است. (این بخش اختیاری است و برای پیمانکارانی است که انبار تجهیزات خورشیدی دارند)
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {contractorProfile.products.map(prod => (
                        <div
                          key={prod.id}
                          className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 bg-slate-50 dark:bg-zinc-850/50 flex flex-col justify-between"
                        >
                          <div>
                            {prod.images?.[0] ? (
                              <div className="w-full h-32 rounded-xl overflow-hidden mb-2 bg-white dark:bg-zinc-800">
                                <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                              </div>
                            ) : null}
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mb-1">
                              {prod.name}
                            </h4>
                            <div className="text-[10px] text-slate-500 mb-2">
                              {prod.category} {prod.brand ? `• ${prod.brand}` : ''}
                            </div>
                            {prod.price && prod.price > 0 && (
                              <div className="text-xs font-black text-[#0284C7] mb-2">
                                {formatCurrencyIRR(prod.price)}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContractorProduct(prod.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: COMPANY PROFILE & CREDENTIALS                                     */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Building2 className="text-[#0284C7]" size={22} />
              مشخصات ثبتی و احراز صلاحیت پیمانکار EPC
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">نام رسمی ثبتی شرکت</label>
                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-slate-200">
                  {currentOrg?.legalName || 'شرکت مهندسی EPC ثبت شده'}
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">نام تجاری</label>
                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-slate-200">
                  {currentOrg?.tradeName || 'پیمانکار EPC'}
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">شناسه ملی شرکت</label>
                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-mono font-bold text-slate-800 dark:text-slate-200">
                  {currentOrg?.nationalId || '۱۰۳۲۰۰۰۰۰۰۰'}
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">وضعیت احراز هویت سازمان</label>
                {currentOrg?.verificationStatus === 'VERIFIED' ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    احراز صلاحیت شده (VERIFIED)
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
                    <Clock size={18} className="text-amber-600" />
                    در انتظار احراز صلاحیت سازمان
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 3. SUBMIT BID MODAL: 5-STEP STRUCTURED FLOW                              */}
      {/* ========================================================================= */}
      {biddingRfq && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-5 sm:p-7 max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span dir="ltr" className="font-mono text-xs font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
                    {biddingRfq.rfqCode}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    گام {bidStep} از ۵
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                  ارسال پیشنهاد فنی و مالی EPC
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setBiddingRfq(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="بستن پنجره ارسال پیشنهاد"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-5 gap-1.5 mb-6 text-[10px] text-center font-bold">
              {[
                { step: 1, title: 'مالی و تجاری' },
                { step: 2, title: 'طرح فنی' },
                { step: 3, title: 'تجهیزات' },
                { step: 4, title: 'اسناد امن' },
                { step: 5, title: 'مرور و ارسال' },
              ].map(s => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setBidStep(s.step)}
                  className={`py-2 px-1 rounded-xl border transition-all min-h-[44px] cursor-pointer ${
                    bidStep === s.step 
                      ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-xs' 
                      : bidStep > s.step 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-400 border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  {s.step}. {s.title}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmitBid} className="space-y-4">
              {/* STEP 1: COMMERCIAL PROPOSAL */}
              {bidStep === 1 && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      شرکت ارائه‌دهنده پیشنهاد (پروفایل EPC) <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={selectedOrgId}
                      onChange={e => setSelectedOrgId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 min-h-[44px]"
                    >
                      {epcOrgs.map(org => (
                        <option key={org.id} value={org.id}>
                          {org.tradeName || org.legalName} (شناسه: {org.nationalId || '—'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      قیمت پیشنهادی پیمانکار (میلیون تومان) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      required
                      min={1}
                      value={bidPriceToman}
                      onChange={e => setBidPriceToman(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-[#0284C7] outline-none text-sm font-bold bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      معادل {(Number(bidPriceToman) * 10000000).toLocaleString('fa-IR')} ریال
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مدت اجرای اعلام‌شده (روز کاری) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      required
                      min={10}
                      value={bidTimelineDays}
                      onChange={e => setBidTimelineDays(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-[#0284C7] outline-none text-sm font-bold bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      شرایط پرداخت پیشنهادی
                    </label>
                    <input 
                      type="text"
                      defaultValue="۲۰٪ پیش‌پرداخت، ۶۰٪ متناسب با تحویل تجهیزات، ۲۰٪ پس از راه‌اندازی و اتصال به شبکه"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-[#0284C7] outline-none text-xs bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: TECHNICAL PROPOSAL */}
              {bidStep === 2 && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تولید سالیانه اعلامی پیمانکار (MWh/سال) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      required
                      min={1}
                      step="0.1"
                      value={bidYieldMwh}
                      onChange={e => setBidYieldMwh(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-[#0284C7] outline-none text-sm font-bold bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      اطلاعات ثبت‌شده توسط شرکت پیمانکار بر مبنای طراحی و شبیه‌سازی تابش
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مدت گارانتی فنی و تعویض تجهیزات (سال) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      required
                      min={1}
                      value={bidWarrantyYears}
                      onChange={e => setBidWarrantyYears(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-[#0284C7] outline-none text-sm font-bold bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: EQUIPMENT INFORMATION */}
              {bidStep === 3 && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        برند و مدل پنل خورشیدی <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={panelBrand}
                        onChange={e => setPanelBrand(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-[#0284C7] outline-none text-xs bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 font-mono min-h-[44px]"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        برند و مدل اینورتر <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={inverterBrand}
                        onChange={e => setInverterBrand(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-[#0284C7] outline-none text-xs bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 font-mono min-h-[44px]"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مشخصات سازه و استراکچر <span className="text-slate-400 font-normal">(اختیاری)</span>
                    </label>
                    <input 
                      type="text"
                      value={rackingType}
                      onChange={e => setRackingType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 focus:border-[#0284C7] outline-none text-xs bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 min-h-[44px]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox"
                      id="monitoring-check"
                      checked={monitoringIncluded}
                      onChange={e => setMonitoringIncluded(e.target.checked)}
                      className="w-5 h-5 rounded text-[#0284C7] focus:ring-blue-500"
                    />
                    <label htmlFor="monitoring-check" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer text-xs">
                      سیستم مانیتورینگ برخط دیتالاگر (SCADA/IoT) شامل می‌شود
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 4: SECURE DOCUMENTS (Strict Technical vs Commercial Separation) */}
              {bidStep === 4 && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-900 dark:text-blue-200">
                    <p className="font-bold mb-1">بارگذاری اسناد پیوست تحت استاندارد Stage 12.3E:</p>
                    <p className="text-[11px] leading-relaxed">
                      اسناد به صورت کاملاً رمزنگاری‌شده و ایزوله در آبجکت استوریج ابری ذخیره شده و فقط کارفرمای استعلام و مجری به آن‌ها دسترسی دارند.
                    </p>
                  </div>

                  {/* Technical Documents Picker */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-850/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        اسناد فنی (سینگل‌لاین، گزارش شبیه‌سازی PVSyst، کاتالوگ تجهیزات)
                      </span>
                      <span className="text-[11px] text-slate-400">{selectedTechFiles.length} فایل</span>
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer min-h-[44px]">
                      <span>انتخاب اسناد فنی (PDF / تصویر)</span>
                      <input 
                        type="file" 
                        multiple 
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden" 
                        onChange={e => {
                          if (e.target.files) {
                            setSelectedTechFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {selectedTechFiles.length > 0 && (
                      <div className="space-y-1">
                        {selectedTechFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded-lg border border-slate-100 dark:border-zinc-700 text-[11px]">
                            <span className="truncate max-w-[280px]">{f.name} ({(f.size / 1024).toFixed(0)} KB)</span>
                            <button 
                              type="button" 
                              onClick={() => setSelectedTechFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 font-bold px-2 py-1 min-h-[36px] flex items-center cursor-pointer"
                            >
                              حذف
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Commercial Documents Picker */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-850/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        اسناد مالی و تجاری (جدول تفکیکی قیمت BOM، ضمانت‌نامه‌ها)
                      </span>
                      <span className="text-[11px] text-slate-400">{selectedCommFiles.length} فایل</span>
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer min-h-[44px]">
                      <span>انتخاب اسناد مالی و تجاری (PDF / تصویر)</span>
                      <input 
                        type="file" 
                        multiple 
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden" 
                        onChange={e => {
                          if (e.target.files) {
                            setSelectedCommFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {selectedCommFiles.length > 0 && (
                      <div className="space-y-1">
                        {selectedCommFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded-lg border border-slate-100 dark:border-zinc-700 text-[11px]">
                            <span className="truncate max-w-[280px]">{f.name} ({(f.size / 1024).toFixed(0)} KB)</span>
                            <button 
                              type="button" 
                              onClick={() => setSelectedCommFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 font-bold px-2 py-1 min-h-[36px] flex items-center cursor-pointer"
                            >
                              حذف
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & FINAL SUBMISSION */}
              {bidStep === 5 && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 space-y-2.5">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-zinc-700 pb-2">
                      خلاصه پیشنهاد جهت ارسال رسمی:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                      <div>قیمت پیشنهادی پیمانکار: <strong className="text-blue-700 dark:text-blue-300 font-bold">{formatPersianNumber(Number(bidPriceToman))} م.ت</strong></div>
                      <div>مدت اجرای اعلام‌شده: <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatPersianNumber(bidTimelineDays)} روز کاری</strong></div>
                      <div>تولید سالیانه اعلامی پیمانکار: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{formatPersianNumber(bidYieldMwh)} MWh</strong></div>
                      <div>مدت گارانتی اعلامی: <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatPersianNumber(bidWarrantyYears)} سال</strong></div>
                      <div className="col-span-2">پنل: <span dir="ltr" className="font-mono">{panelBrand}</span> | اینورتر: <span dir="ltr" className="font-mono">{inverterBrand}</span></div>
                      <div className="col-span-2 text-slate-500">
                        اسناد پیوست: {selectedTechFiles.length} سند فنی + {selectedCommFiles.length} سند تجاری
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed">
                    با کلیک روی «ارسال قطعی پیشنهاد»، پیشنهاد ثبت گردیده و در پیشخوان کارفرمای استعلام قرار می‌گیرد.
                  </div>
                </div>
              )}

              {/* Navigation & Submit Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <div>
                  {bidStep > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setBidStep(prev => prev - 1)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 font-bold text-xs min-h-[44px] cursor-pointer"
                    >
                      گام قبلی
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setBiddingRfq(null)}
                    className="px-4 py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs min-h-[44px] cursor-pointer"
                  >
                    انصراف
                  </button>

                  {bidStep < 5 ? (
                    <button 
                      type="button" 
                      onClick={() => setBidStep(prev => prev + 1)}
                      className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs min-h-[44px] cursor-pointer"
                    >
                      گام بعدی
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      disabled={submittingBid}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 min-h-[44px] cursor-pointer"
                    >
                      {submittingBid ? 'در حال ثبت و ارسال اسناد...' : 'ارسال قطعی پیشنهاد به کارفرما'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVISE BID MODAL */}
      {revisingBid && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-1.5 flex-wrap">
              <span>ارسال نسخه اصلاحیه پیشنهاد</span>
              <span dir="ltr" className="font-mono text-sm text-[#0284C7]">({revisingBid.bidCode})</span>
            </h3>
            <form onSubmit={handleReviseBid} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">قیمت اصلاح‌شده (میلیون تومان)</label>
                <input 
                  type="number"
                  required
                  min={1}
                  value={revisePriceToman}
                  onChange={e => setRevisePriceToman(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 outline-none text-sm font-bold min-h-[44px]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">دلیل اصلاح پیشنهاد</label>
                <input 
                  type="text"
                  required
                  value={reviseReason}
                  onChange={e => setReviseReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 outline-none text-xs min-h-[44px]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setRevisingBid(null)}
                  className="px-4 py-2.5 text-slate-500 font-bold min-h-[44px] cursor-pointer"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  disabled={submittingBid}
                  className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl font-bold min-h-[44px] cursor-pointer"
                >
                  {submittingBid ? 'در حال ثبت...' : 'ثبت نسخه اصلاحیه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT PORTFOLIO PROJECT MODAL */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {editingProject ? 'ویرایش نمونه‌پروژه' : 'ثبت نمونه‌پروژه جدید در سبد پروژه‌ها'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان پروژه <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={projectTitle}
                  onChange={e => setProjectTitle(e.target.value)}
                  placeholder="مثال: نیروگاه خورشیدی ۱۰۰ کیلووات متصل به شبکه شهرک صنعتی شیراز"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نوع کاربری پروژه</label>
                  <select
                    value={projectType}
                    onChange={e => setProjectType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                  >
                    <option value="نیروگاهی">نیروگاهی (Utility)</option>
                    <option value="صنعتی">صنعتی و کارگاهی</option>
                    <option value="تجاری">تجاری و اداری</option>
                    <option value="مسکونی">مسکونی و ویلایی</option>
                    <option value="کشاورزی">کشاورزی و پمپ آب</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ظرفیت نصب‌شده (کیلووات)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={projectCapacity}
                    onChange={e => setProjectCapacity(e.target.value)}
                    placeholder="مثال: ۱۰۰"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">استان</label>
                  <input
                    value={projectProvince}
                    onChange={e => setProjectProvince(e.target.value)}
                    placeholder="مثال: فارس"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شهر</label>
                  <input
                    value={projectCity}
                    onChange={e => setProjectCity(e.target.value)}
                    placeholder="مثال: شیراز"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">سال اجرا</label>
                  <input
                    value={projectYear}
                    onChange={e => setProjectYear(e.target.value)}
                    placeholder="مثال: ۱۴۰۲"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شرح مشخصات فنی و تجهیزات</label>
                <textarea
                  rows={3}
                  value={projectDesc}
                  onChange={e => setProjectDesc(e.target.value)}
                  placeholder="شرح اینورترهای به‌کاررفته، استراکچر، نوع پنل، تولید سالیانه و ویژگی‌های فنی..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Project Images Upload */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تصاویر پروژه (مخزن امن ابری)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {projectImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden group">
                      <img src={img} alt="پروژه" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProjectImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-slate-400 hover:border-[#0284C7] hover:text-[#0284C7] transition-colors cursor-pointer shrink-0">
                    {uploadingProjectImage ? (
                      <Loader2 className="animate-spin text-[#0284C7]" size={20} />
                    ) : (
                      <>
                        <Upload size={18} />
                        <span className="text-[9px] font-bold mt-0.5">افزودن</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleUploadProjectImage}
                      disabled={uploadingProjectImage}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-bold min-h-[44px] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingProject || uploadingProjectImage}
                  className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingProject && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingProject ? 'ذخیره تغییرات' : 'ثبت پروژه'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CONTRACTOR PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {editingContractorProduct ? 'ویرایش تجهیز اختصاصی' : 'افزودن تجهیز اختصاصی پیمانکار (اختیاری)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContractorProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نام تجهیز <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  placeholder="مثال: پنل ۵۵۰ وات Longi Solar"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">دسته‌بندی</label>
                  <select
                    value={prodCategory}
                    onChange={e => setProdCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                  >
                    <option value="پنل خورشیدی">پنل خورشیدی</option>
                    <option value="اینورتر">اینورتر</option>
                    <option value="استراکچر">استراکچر</option>
                    <option value="باتری">باتری</option>
                    <option value="سایر تجهیزات">سایر تجهیزات</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">قیمت واحد (تومان، اختیاری)</label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={e => setProdPrice(e.target.value)}
                    placeholder="مثال: ۴۲۰۰۰۰۰"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">برند</label>
                  <input
                    value={prodBrand}
                    onChange={e => setProdBrand(e.target.value)}
                    placeholder="مثال: Longi"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مدل</label>
                  <input
                    value={prodModel}
                    onChange={e => setProdModel(e.target.value)}
                    placeholder="مثال: LR5-72HBD"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white min-h-[44px]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شرح مشخصات</label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={e => setProdDesc(e.target.value)}
                  placeholder="شرح کوتاه ویژگی‌های فنی یا گارانتی..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Product Images Upload */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تصویر تجهیز
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {prodImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden group">
                      <img src={img} alt="تجهیز" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProdImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center text-slate-400 hover:border-[#0284C7] hover:text-[#0284C7] transition-colors cursor-pointer shrink-0">
                    {uploadingProdImage ? (
                      <Loader2 className="animate-spin text-[#0284C7]" size={20} />
                    ) : (
                      <>
                        <Upload size={18} />
                        <span className="text-[9px] font-bold mt-0.5">افزودن</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleUploadProdImage}
                      disabled={uploadingProdImage}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-bold min-h-[44px] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingProd || uploadingProdImage}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingProd && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingContractorProduct ? 'ذخیره تغییرات' : 'ثبت تجهیز'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <PersianConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title={deleteConfirmState.title}
        message={deleteConfirmState.message}
        confirmText="حذف نهایی"
        cancelText="انصراف"
        variant="danger"
        onConfirm={deleteConfirmState.onConfirm}
        onClose={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
