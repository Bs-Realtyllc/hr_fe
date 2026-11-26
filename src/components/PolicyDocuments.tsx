'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import PdfThumbnail from './PdfThumbnail';
import Button from './Button/Button';
import MaskIcon from './ui/MaskIcon';
import InputField from './InputField/InputField';
import {
  initialMockFolders,
  mockPolicies,
} from '@/data/mockResources';

const BACKEND = process.env.NEXT_PUBLIC_API_URL!.replace('/api', '');
interface Policy {
  id: number;
  type: string;
  category: string;
  title: string;
  file_path: string;
  folder_path: string | null;
  version: number;
  uploaded_by_name: string | null;
  created_at: string;
  date_modified?: string | null;
  file_size?: string | number | null;
  is_pinned: boolean | number;
}

interface Acknowledgement {
  id: number;
  policy_id: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
}

interface Submission {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  signed_file_path: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
}

interface PolicyFolder {
  id: number;
  name: string;
  description: string;
  fileCount: number;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function isRecent(dateStr: string) {
  const ageMs = Date.now() - new Date(dateStr).getTime();
  return ageMs < 2 * 24 * 60 * 60 * 1000; // 2 days
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';
}

interface PolicyDocumentsProps {
  category?: string;
  heading: string;
  adminSubtitle: string;
  employeeSubtitle: string;
  emptyMessage?: string;
  requiresSignature?: boolean;
}

export default function PolicyDocuments({
  category,
  requiresSignature = true,
}: PolicyDocumentsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [policies, setPolicies] = useState<Policy[]>(mockPolicies);
  const mockFilesRef = useRef<Record<string, File>>({});
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewFor, setPreviewFor] = useState<{ title: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pinningId, setPinningId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [myAcks, setMyAcks] = useState<Acknowledgement[]>([]);
  const [signingId, setSigningId] = useState<number | null>(null);
  const [signTarget, setSignTarget] = useState<Policy | null>(null);

  const signInputRef = useRef<HTMLInputElement>(null);
  const individualFileInputRef = useRef<HTMLInputElement>(null);
  const [reviewFor, setReviewFor] = useState<Policy | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const [rejectReason, setRejectReason] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('down');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [fileView, setFileView] = useState<'list' | 'grid'>('list');
  type SortField = 'name' | 'modified' | 'uploaded' | 'size';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedSortField, setSelectedSortField] =
    useState<SortField>('name');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [selectedPolicyIds, setSelectedPolicyIds] = useState<number[]>([])

  const [folders, setFolders] = useState<PolicyFolder[]>(initialMockFolders);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [openFolderId, setOpenFolderId] = useState<number | string | null>(null);
  const folderDropdownRefs = useRef<Record<number | string, HTMLDivElement | null>>({});
  const [activeFolder, setActiveFolder] = useState<PolicyFolder | null>(null);

  // create folder
  const createFolder = () => {
    if (!folderName.trim()) {
      setError('Please enter a folder name.');
      return;
    };

    const selectedIds = [...selectedPolicyIds];
    const newFolderName = folderName.trim();

    //move selected files into new folder
    setPolicies(currentPolicies =>
      currentPolicies.map(policy =>
        selectedIds.includes(policy.id)
          ? { ...policy, folder_path: newFolderName }
          : policy
      )
    );

    const newFolder: PolicyFolder = {
      id: Date.now(),
      name: newFolderName,
      description: folderDescription,
      fileCount: selectedIds.length,
    }
    // Prepend the new folder to your state list
    setFolders((prevFolders) => [newFolder, ...prevFolders]);
    // Reset form and close modal
    setSelectedPolicyIds([]);
    setFolderName('');
    setFolderDescription('');
    setShowCreateFolder(false);
    setError('');
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openFolderId === null) return;

      const activeRef = folderDropdownRefs.current[openFolderId];
      if (activeRef && event.target instanceof Node && !activeRef.contains(event.target)) {
        setOpenFolderId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openFolderId]);


  useEffect(() => {
    if (activeDropdown === null) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !dropdownRef.current?.contains(event.target)
      ) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [activeDropdown]);

  useEffect(() => {
    if (!showSortMenu) return;

    function closeSortMenuOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !sortMenuRef.current?.contains(event.target)
      ) {
        setShowSortMenu(false);
      }
    }

    document.addEventListener('pointerdown', closeSortMenuOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeSortMenuOnOutsideClick);
  }, [showSortMenu]);


  const ackFor = (policyId: number) => myAcks.find(a => a.policy_id === policyId);
  const loadMyAcks = () =>
    api.get<Acknowledgement[]>('/policies/acknowledgements/mine').then(setMyAcks).catch(() => { });
  useEffect(() => { if (requiresSignature && !isAdmin) loadMyAcks(); }, [requiresSignature, isAdmin]);

  const load = () => {
    // Keep backend policy records untouched while this screen uses mock data.
    // api.get<Policy[]>(category ? `/policies?category=${category}` : '/policies').then(setPolicies);
    setPolicies(
      mockPolicies.filter(
        policy =>
          !category ||
          category === 'policy' ||
          policy.category === category
      )
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);
  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch = policy.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFolder = activeFolder
      ? policy.folder_path === activeFolder.name
      : !folders.some(folder => folder.name === policy.folder_path);

    return matchesSearch && matchesFolder;
  });

  function handleFilePicked(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

    if (!files.length) return;

    // Accept PDF files even if the browser does not provide the MIME type.
    const pdfFiles = files.filter(file =>
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    );

    if (!pdfFiles.length) {
      setError('No PDF files found in the selected folder.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const newPolicies = pdfFiles.map((picked, index): Policy => {
        const id = Date.now() * 1000 + index;
        const title = titleFromFilename(picked.name);
        const relativePath = (
          picked as File & { webkitRelativePath?: string }
        ).webkitRelativePath;
        const folderPath = activeFolder
          ? activeFolder.name
          : relativePath
            ? relativePath.split('/').slice(0, -1).join('/')
            : '';
        const filePath = `mock-${id}-${picked.name}`;
        mockFilesRef.current[filePath] = picked;

        return {
          id,
          type: slugify(title),
          category: category || 'general',
          title,
          file_path: filePath,
          folder_path: folderPath || null,
          version: 1,
          uploaded_by_name: user?.name || 'Admin',
          created_at: new Date().toISOString(),
          date_modified: new Date().toISOString(),
          file_size: `${(picked.size / (1024 * 1024)).toFixed(1)} MB`,
          is_pinned: false,
        };
      });

      // Backend uploads remain available below when policy storage is enabled again.
      /*
      const token = getToken();
      const fd = new FormData();
      fd.append('type', slugify(titleFromFilename(pdfFiles[0].name)));
      fd.append('title', titleFromFilename(pdfFiles[0].name));
      if (category) fd.append('category', category);
      fd.append('file', pdfFiles[0]);
      await fetch(`${BACKEND}/api/policies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      */

      setPolicies(currentPolicies => [...newPolicies, ...currentPolicies]);
    } finally {
      setUploading(false);
    }
  }

  async function getPdfBlob(
    folder: 'policies' | 'policy-acks',
    filePath: string
  ): Promise<Blob> {
    if (folder === 'policies' && mockFilesRef.current[filePath]) {
      return mockFilesRef.current[filePath];
    }

    const token = getToken();

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(
      `${BACKEND}/uploads/${folder}/${encodeURIComponent(filePath)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unable to fetch PDF: ${response.status}`);
    }

    const blob = await response.blob();

    if (!blob.size) {
      throw new Error('Empty PDF file');
    }

    return blob;
  }

  useEffect(() => {
    if (fileView !== 'grid' || !isAdmin || policies.length === 0) {
      setThumbnailUrls({});
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];
    setThumbnailUrls({});

    async function loadThumbnails() {
      const thumbnails = await Promise.all(
        policies.map(async policy => {
          try {
            const blob = await getPdfBlob('policies', policy.file_path);
            if (cancelled) return null;

            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            return [policy.id, url] as const;
          } catch (error) {
            console.error(`Could not load PDF thumbnail for "${policy.title}".`, error);
            return null;
          }
        })
      );

      if (!cancelled) {
        setThumbnailUrls(
          Object.fromEntries(thumbnails.filter((thumbnail): thumbnail is readonly [number, string] => thumbnail !== null))
        );
      }
    }

    void loadThumbnails();

    return () => {
      cancelled = true;
      objectUrls.forEach(URL.revokeObjectURL);
    };
  }, [fileView, isAdmin, policies]);

  function toggleSelectPolicy(id: number) {
    setSelectedPolicyIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(policyId => policyId !== id);
      }
      return [...prev, id];
    });
  }

  async function previewFile(
    title: string,
    folder: 'policies' | 'policy-acks',
    filePath: string
  ) {
    try {
      setError('');
      setPreviewLoading(true);

      const blob = await getPdfBlob(folder, filePath);
      const blobUrl = URL.createObjectURL(blob);

      setPreviewFor({
        title,
        url: blobUrl,
      });
    } catch (error) {
      console.error('Preview PDF error:', error);
      setError(`Could not preview "${title}".`);
    } finally {
      setPreviewLoading(false);
    }
  }



  function previewPolicy(p: Policy) {
    setActiveDropdown(null);
    previewFile(p.title, 'policies', p.file_path);
  }

  function previewSubmission(sub: Submission, policyTitle: string) {
    previewFile(
      `${sub.employee_name} — ${policyTitle}`,
      'policy-acks',
      sub.signed_file_path
    );
  }

  function closePreview() {
    if (previewFor?.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewFor.url);
    }

    setPreviewFor(null);
  }

  // function previewSubmission(sub: Submission, policyTitle: string) {

  //   setPreviewFor({

  //     title: `${sub.employee_name} — ${policyTitle}`,

  //     url: `${BACKEND}/uploads/policy-acks/${sub.signed_file_path}`,

  //   });

  // }

  async function downloadFile(
    title: string,
    folder: 'policies' | 'policy-acks',
    filePath: string
  ) {
    try {
      setError('');

      const blob = await getPdfBlob(folder, filePath);
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = title.toLowerCase().endsWith('.pdf')
        ? title
        : `${title}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Download PDF error:', error);
      setError(`Could not download "${title}".`);
    }
  }

  function downloadPolicy(p: Policy) {
    setActiveDropdown(null);
    downloadFile(p.title, 'policies', p.file_path);
  }

  function startSigning(p: Policy) {
    setSignTarget(p);
    setError('');
    signInputRef.current?.click();
  }

  async function handleSignFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    const policy = signTarget;
    setSignTarget(null);
    if (!picked || !policy) return;
    setSigningId(policy.id);
    setError('');
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('file', picked);
      const res = await fetch(`${BACKEND}/api/policies/${policy.id}/acknowledgements`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error();
      await loadMyAcks();
    } catch {

      setError('Could not submit your signed copy. Please try again.');
    } finally {
      setSigningId(null);
    }

  }

  function openReview(p: Policy) {
    setReviewFor(p);
    setRejectingId(null);
    setRejectReason('');
    setSubmissionsLoading(true);
    api.get<Submission[]>(`/policies/${p.id}/acknowledgements`)
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setSubmissionsLoading(false));
  }

  async function approveSubmission(sub: Submission) {
    setReviewingId(sub.id);
    try {
      await api.put(`/policies/acknowledgements/${sub.id}/review`, { status: 'approved' });
      setSubmissions(subs => subs.map(s => s.id === sub.id ? { ...s, status: 'approved', rejection_reason: null } : s));
    } catch {
      setError('Could not approve this submission. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  async function rejectSubmission(sub: Submission) {
    if (!rejectReason.trim()) return;
    setReviewingId(sub.id);
    try {
      await api.put(`/policies/acknowledgements/${sub.id}/review`, {
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
      });

      setSubmissions(subs => subs.map(s => s.id === sub.id ? { ...s, status: 'rejected', rejection_reason: rejectReason.trim() } : s));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      setError('Could not reject this submission. Please try again.');
    } finally {
      setReviewingId(null);
    }
  }

  function togglePin(p: Policy) {
    const nextPinned = !p.is_pinned;
    setPinningId(p.id);
    try {
      setPolicies(currentPolicies =>
        currentPolicies.map(policy =>
          policy.id === p.id ? { ...policy, is_pinned: nextPinned } : policy
        )
      );
    } catch {
      setError('Could not update pin. Please try again.');
    } finally {
      setPinningId(null);
    }
  }

  function handleDelete(p: Policy) {
    if (!window.confirm(`Remove "${p.title}" from this mock list? Backend files are not changed.`)) return;
    setDeletingId(p.id);
    try {
      // await api.delete(`/policies/${p.id}`);
      setPolicies(currentPolicies => currentPolicies.filter(policy => policy.id !== p.id));
      delete mockFilesRef.current[p.file_path];
    } catch {
      setError('Could not remove this document from the mock list.');
    } finally {
      setDeletingId(null);
    }
  }

  // short filter

  const sortedPolicies = [...filteredPolicies].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.title.localeCompare(b.title, undefined, {
          sensitivity: 'base',
        });
        break;

      case 'modified':
      case 'uploaded':
        comparison =
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime();
        break;

      case 'size':
        // File size is not currently provided by your Policy API.
        comparison = 0;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const sortOptions = [
    { label: 'Name', field: 'name' },
    { label: 'Date Modified', field: 'modified' },
    { label: 'Date Uploaded', field: 'uploaded' },
    { label: 'File Size', field: 'size' },
  ] as const;

  const directionOptions: Record<
    SortField,
    { label: string; value: SortDirection }[]
  > = {
    name: [
      { label: 'A to Z', value: 'asc' },
      { label: 'Z to A', value: 'desc' },
    ],

    modified: [
      { label: 'Newest to Oldest', value: 'desc' },
      { label: 'Oldest to Newest', value: 'asc' },
    ],

    uploaded: [
      { label: 'Newest to Oldest', value: 'desc' },
      { label: 'Oldest to Newest', value: 'asc' },
    ],

    size: [
      { label: 'Largest to Smallest', value: 'desc' },
      { label: 'Smallest to Largest', value: 'asc' },
    ],
  };

  const PdfIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 5H9V1L13 5ZM9 1H3C2.45 1 2 1.45 2 2V16C2 16.55 2.45 17 3 17H13C13.55 17 14 16.55 14 16V5L9 1Z"
        stroke="#A51D1D"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <text
        x="8"
        y="12"
        textAnchor="middle"
        fontSize="4.5"
        fontWeight="bold"
        fill="#A51D1D"
      >
        PDF
      </text>
    </svg>
  );

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const hasPolicies = filteredPolicies.length > 0;
  const hasFolders = folders.length > 0;
  const hasContent = activeFolder
    ? hasPolicies
    : hasPolicies || hasFolders;
  const showGridView = activeFolder
    ? fileView === 'grid'
    : hasFolders || fileView === 'grid';
  return (

    <div className=' w-full flex flex-col gap-6 mt-4'>

      {activeFolder && (
        <div className="flex px-3 items-center gap-2 text-[14px] font-medium ">
          <button
            type="button"
            onClick={() => {
              setActiveFolder(null);
              setSearch('');
              setSelectedPolicyIds([]);
            }}
            className=" text-(--soft-white-dark-hover) "
          >
            Resources
          </button>

          <MaskIcon src='/icons/chevron-right.svg' size={18} color='var(--soft-white-dark-hover)' />
          <span className="text-(--gray-dark-active)">
            {activeFolder.name}
          </span>
        </div>
      )}

      {/* search box section */}
      {(hasContent || activeFolder) && <div className="w-full  flex gap-3">
        <div className='flex w-full gap-3'>
          <div className="search-bar w-full">

            <span
              className="icon-mask search-bar-icon"
              style={{ WebkitMaskImage: 'url(/icons/search.svg)', maskImage: 'url(/icons/search.svg)' }}
            />

            <input
              className="form-input"
              placeholder="Search by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

          </div>

          {/* List / Grid toggle: show only when no folders exist */}
          {(!hasFolders || activeFolder) && (
            <div className="flex p-2 rounded-lg bg-(--soft-white-light) gap-1">

              {/* List View */}
              <button
                type="button"
                onClick={() => setFileView('list')}
                className={`flex justify-center items-center px-2 py-1 rounded-sm transition-colors
      ${fileView === 'list'
                    ? 'bg-[#E0F0F9]'
                    : 'hover:bg-[#E0F0F9]'
                  }`}
              >
                <img
                  src="/icons/menu.svg"
                  alt="List view"
                  width={20}
                  height={20}
                />
              </button>

              {/* Grid View */}
              <button
                type="button"
                onClick={() => setFileView('grid')}
                className={`flex justify-center items-center px-2 py-1 rounded-sm transition-colors
      ${fileView === 'grid'
                    ? 'bg-[#E0F0F9]'
                    : 'hover:bg-[#E0F0F9]'
                  }`}
              >
                <img
                  src="/icons/grid.svg"
                  alt="Grid view"
                  width={20}
                  height={20}
                />
              </button>
            </div>
          )}

        </div>

        {/* Upload individual PDFs */}
        {user?.role === 'admin' && (
          <div className='min-w-[191px]'>
            {
              activeFolder ? (
                //inside folder: add document
                <Button
                  className='w-full!'
                  variant="primary"
                  size="medium"
                  onClick={() => {
                    setError('');
                    individualFileInputRef.current?.click();
                  }}
                  disabled={uploading}
                >
                  + Add Documents
                </Button>) : hasFolders ? (
                  <Button
                    className='w-full!'
                    variant="primary"
                    size="medium"
                    onClick={() => {
                      setError('');
                      setShowCreateFolder(true);
                    }}
                    disabled={uploading}
                  >
                    Create Folder
                  </Button>
                ) : (
                // No folders yet: Add Documents
                <Button
                  className="w-full!"
                  variant="primary"
                  size="medium"
                  onClick={() => {
                    setError('');
                    individualFileInputRef.current?.click();
                  }}
                  disabled={uploading}
                >
                  + Add Documents
                </Button>
              )
            }
          </div>)

        }
      </div>

      }

      <div className="h-full ">

        <div className='' style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>



          {isAdmin && (

            <>
              <div className="flex mt-4 gap-2">
              </div>

              {/* Individual PDF input */}
              <input
                ref={individualFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilePicked}
              />

              {/* Folder input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                // @ts-expect-error Non-standard browser attribute
                webkitdirectory=""
                style={{ display: 'none' }}
                onChange={handleFilePicked}
              />
            </>
          )}

        </div>

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        {loading ? (

          <p className="text-muted" style={{ fontSize: 13.5 }}>Loading…</p>
        ) : !hasContent && policies.length === 0 ? (

          <div className="w-full h-full rounded-lg bg-(--soft-white-light) flex flex-col items-center justify-center ">
            {/* Empety state */}
            {isAdmin ? (
              <div className="rounded-xl border border-dashed border-(--white-dark) py-10 px-32 flex justify-center"
                style={{
                  width: "514px",
                  height: "272px",
                  gap: "10px",
                  paddingTop: "40px",
                  paddingRight: "128px",
                  paddingBottom: "40px",
                  paddingLeft: "128px",
                  backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%239ca3af' stroke-width='1' stroke-dasharray='10%2c 4' stroke-dashoffset='0' stroke-linecap='square'/%3e%3csvg%3e")`,
                  backgroundClip: "padding-box"
                }}>
                <div className=' w-[252px] flex flex-col gap-3 items-center'>
                  <div className='w-12 h-12 bg-(--blue-sky-light) rounded-full flex justify-center items-center'>
                    <MaskIcon src='/icons/cloud-upload.svg' size={32} color='var(--blue-dark-normal)' />
                  </div>

                  <div className='flex flex-col gap-2 items-center'>
                    <p className='text-[16px] font-semibold text-(--gray-dark-active)'>Drag and drop your files here</p>
                    <p className='text-[14px] font-medium text-(--gray-normal-active)'>or</p>
                    <Button size='small'
                      onClick={() => {
                        setError('');
                        individualFileInputRef.current?.click();
                      }}
                      disabled={uploading}>Browse files</Button>
                    <p className='text-[14px] font-medium text-(--gray-normal) '>Supported formats: PDF, DOCX, PPTX</p>
                  </div>


                </div>

              </div>
            ) : (
              <>
                < div className=' flex flex-1 w-full justify-center items-center rounded-lg  bg-(--soft-white-light)'>
                  <div className='flex flex-col justify-center items-center w-[574px] h-[253px]'>
                    <img src="/images/documents-01.webp" alt="doc" height={'141px'} width={'160px'} />
                    <div className='flex flex-col py-4 px-2 text-center gap-1'>
                      <h1 className='text-[20px] text-(--neutral-dark) font-semibold'>No resources available yet</h1>
                      <p className='text-[16px] text-(--gray-normal-active) font-medium'>Company policies, handbooks, and helpful resources will appear here once they're added.</p>

                    </div>
                  </div>
                </div>
              </>
            )}



          </div>
        ) : !hasContent && policies.length > 0 ? (
          <p className="h-full text-muted" style={{ fontSize: 13.5 }}>
            {activeFolder
              ? `No documents found in ${activeFolder.name}.`
              : search
                ? 'No documents match your search.'
                : 'No documents available.'}
          </p>
        )
          : (
            <>
              {
                !showGridView ? (
                  <div className=' p-4 w-full h-full overflow-x-auto rounded-lg bg-(--soft-white-light) '>

                    <table className=" w-full min-w-[750px] border-separate border-spacing-y-2">
                      <thead>
                        <tr className="bg-(--soft-white-normal)">
                          <th className="px-4 py-3 rounded-l-lg text-left ">
                            <div className="flex items-center gap-2 text-(--gray-dark-active) text-[16px] font-medium">
                              Name
                              <button
                                type="button"
                                aria-label={`Sort by name ${sortDirection === 'asc' ? 'ascending' : 'descending'
                                  }`}
                                onClick={() => {
                                  if (sortField !== 'name') {
                                    setSortField('name');
                                    setSortDirection('asc');
                                  } else {
                                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                  }
                                }}
                                className="bg-(--gray-normal) p-1 rounded-full h-[22px] w-[22px] flex items-center justify-center cursor-pointer "
                              >
                                <span
                                  className="inline-block h-4 w-4 bg-(--soft-white-light) transition-transform duration-200"
                                  style={{
                                    WebkitMaskImage: 'url(/icons/arrow-up.svg)',
                                    maskImage: 'url(/icons/arrow-up.svg)',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                    transform:
                                      sortField !== 'name'
                                        ? 'rotate(0deg)'
                                        : sortDirection === 'desc'
                                          ? 'rotate(180deg)'
                                          : 'rotate(0deg)',
                                  }}
                                />
                              </button>
                            </div>
                          </th>

                          <th className="">
                            <span className="text-center text-(--gray-dark-active) text-[16px] font-medium">Owner</span>

                          </th>

                          <th >
                            <span className=" text-center text-(--gray-dark-active) text-[16px] font-medium"> Date Modified</span>

                          </th>

                          <th >
                            <span className=" text-center text-(--gray-dark-active) text-[16px] font-medium">File Size</span>

                          </th>


                          <th className='flex justify-center' >
                            <div ref={sortMenuRef} className="  rounded-r-lg w-14 text-center items-center px-4 relative inline-block">
                              <button
                                type="button"
                                onClick={() => setShowSortMenu(prev => !prev)}
                                aria-label="Open sorting options"
                                aria-expanded={showSortMenu}
                                className="p-2 rounded-md hover:bg-(--blue-dark-light-hover)"
                              >
                                <span
                                  className="inline-block h-4 w-4 bg-(--gray-dark-active) transition-transform duration-200"
                                  style={{
                                    WebkitMaskImage: 'url(/icons/bar-chart-2.svg)',
                                    maskImage: 'url(/icons/bar-chart-2.svg)',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                    transform: 'rotate(90deg)',
                                  }}
                                />
                              </button>


                              {showSortMenu && (
                                <div className="absolute right-0 top-full mt-2 w-[260px] bg-(--soft-white-light) border border-(--white-light-hover) rounded-lg shadow-lg z-500 p-3 text-left ">

                                  {/* Sort By */}
                                  <div className="mb-3">
                                    <p className="px-2 py-2 text-[12px] font-medium text-(--soft-white-dark-active) ">
                                      Sort By
                                    </p>

                                    {sortOptions.map(option => (
                                      <button
                                        key={option.field}
                                        type="button"
                                        onClick={() => {
                                          setSelectedSortField(option.field);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium text-(--gray-dark-hover) ${selectedSortField === option.field
                                          ? 'bg-[#E9EFF4]  font-medium'
                                          : 'hover:bg-[#E9EFF4]'
                                          }`}
                                      >


                                        <span className="w-4 shrink-0 text-(--blue-dark-normal)">
                                          {selectedSortField === option.field ? '✓' : ''}
                                        </span>

                                        {option.label}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="border-t border-(--white-light-hover) my-2" />

                                  {/* Sort Direction */}
                                  <div>
                                    <p className="px-2 py-2 text-[12px] font-medium text-(--soft-white-dark-active) ">
                                      Sort Direction
                                    </p>

                                    {directionOptions[selectedSortField].map(direction => (
                                      <button
                                        key={direction.value}
                                        type="button"
                                        onClick={() => {
                                          setSortField(selectedSortField);
                                          setSortDirection(direction.value);
                                          setShowSortMenu(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium text-[--gray-dark-hover] ${sortField === selectedSortField &&
                                          sortDirection === direction.value
                                          ? 'bg-[#E9EFF4]  font-medium'
                                          : ' hover:bg-[#E9EFF4]'
                                          }`}
                                      >


                                        <span className="w-4 shrink-0 text-(--blue-dark-normal)">
                                          {sortField === selectedSortField &&
                                            sortDirection === direction.value
                                            ? '✓'
                                            : ''}
                                        </span>

                                        {direction.label}
                                      </button>
                                    ))}
                                  </div>

                                </div>
                              )}

                            </div>
                          </th>

                        </tr>
                      </thead>
                      <tbody aria-hidden="true" className="h-2 block"></tbody>
                      <tbody >
                        {filteredPolicies.length > 0 ? (
                          sortedPolicies.map((p) => (
                            <tr
                              key={p.id}
                              className={`group transition-colors ${selectedPolicyIds.includes(p.id)
                                ? 'bg-[#EBF5FB]'
                                : 'hover:bg-(--blue-sky-light)'
                                }`}
                            >
                              {/* Name */}
                              <td className="px-4 py-4 border-b border-(--gray-light-hover) rounded-l-lg">
                                <div className="flex items-center gap-3">
                                  <PdfIcon />

                                  <span className="text-[14px] font-medium text-(--gray-darker)">
                                    {p.title.toLowerCase().endsWith('.pdf')
                                      ? p.title
                                      : `${p.title}.pdf`
                                    }
                                  </span>
                                </div>
                              </td>

                              {/* Owner */}
                              <td className=" border-b border-(--gray-light-hover)">
                                <span className="text-[14px] text-(--gray-normal) ">
                                  {p.uploaded_by_name || 'Admin'}
                                </span>
                              </td>

                              {/* Date Modified */}
                              <td className=" border-b border-(--gray-light-hover)">
                                <span className="text-[14px] text-(--gray-normal)">
                                  {p.date_modified
                                    ? fmtDate(p.date_modified)
                                    : p.created_at
                                      ? fmtDate(p.created_at)
                                      : 'N/A'}
                                </span>
                              </td>

                              {/* File Size */}
                              <td className="px-4 py-4 border-b border-(--gray-light-hover)">
                                <span className="text-[14px] text-(--gray-normal)">
                                  {p.file_size || 'N/A'}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-4 border-b border-(--gray-light-hover) rounded-r-lg text-center">
                                {selectedPolicyIds.includes(p.id) ? (
                                  <button
                                    type="button"
                                    aria-label="Unselect file"
                                    onClick={() => toggleSelectPolicy(p.id)}
                                    className="p-1 rounded-md hover:bg-(--blue-dark-light) transition-colors cursor-pointer mx-auto block"
                                  >
                                    <img
                                      src="/icons/square-check.svg"
                                      alt="Selected"
                                      className="w-5 h-5 mx-auto"
                                    />
                                  </button>
                                ) : (
                                  <div
                                    ref={activeDropdown === p.id ? dropdownRef : null}
                                    className="relative inline-block"
                                  >
                                    {/* Three dots button */}
                                    <button
                                      type="button"
                                      aria-label={`Actions for ${p.title}`}
                                      aria-expanded={activeDropdown === p.id}
                                      onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();

                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        const dropdownHeight = 190;

                                        setDropdownDirection(
                                          spaceBelow < dropdownHeight ? 'up' : 'down'
                                        );

                                        setActiveDropdown(prev => prev === p.id ? null : p.id);
                                      }}
                                      className="p-1 rounded-md hover:bg-(--blue-dark-light) transition-colors"
                                    >
                                      <span
                                        className="inline-block h-6 w-6 bg-(--gray-normal)"
                                        style={{
                                          WebkitMaskImage: 'url(/icons/dots-menu.svg)',
                                          maskImage: 'url(/icons/dots-menu.svg)',
                                          WebkitMaskRepeat: 'no-repeat',
                                          maskRepeat: 'no-repeat',
                                          WebkitMaskPosition: 'center',
                                          maskPosition: 'center',
                                          WebkitMaskSize: 'contain',
                                          maskSize: 'contain',
                                        }}
                                      />
                                    </button>

                                    {/* Dropdown menu */}
                                    {activeDropdown === p.id && (
                                      <div className={`absolute right-0 w-[264px] bg-(--soft-white-light-active) border border-(--white-light-hover) rounded-lg z-[100] p-3 text-left shadow-lg ${dropdownDirection === 'up'
                                        ? 'bottom-full mb-1'
                                        : 'top-full mt-1'
                                        }`}>
                                        {isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              toggleSelectPolicy(p.id);
                                              setActiveDropdown(null);
                                            }}
                                            className="flex items-center gap-3 w-full p-2 rounded-lg text-[14px] font-medium text-(--gray-dark-hover) hover:bg-(--blue-dark-light)"
                                          >
                                            <img src="/icons/square-check.svg" alt="" className="w-4 h-4" />
                                            Select
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => {
                                            previewPolicy(p);
                                            setActiveDropdown(null);
                                          }}
                                          className="flex items-center gap-3 w-full p-2 rounded-lg text-[14px] font-medium text-(--gray-dark-hover) hover:bg-(--blue-dark-light) transition-colors"
                                        >
                                          <img src="/icons/eye.svg" alt="" className="w-4 h-4" />
                                          Preview
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => downloadPolicy(p)}
                                          className="flex items-center gap-3 w-full p-2 rounded-lg text-[14px] font-medium text-(--gray-dark-hover) hover:bg-(--blue-dark-light) transition-colors"
                                        >
                                          <img src="/icons/download.svg" alt="" className="w-4 h-4" />
                                          Download
                                        </button>

                                        {isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdown(null);
                                              handleDelete(p);
                                            }}
                                            disabled={deletingId === p.id}
                                            className="flex items-center gap-3 w-full p-2 rounded-lg text-[14px] font-medium text-(--gray-dark-hover) hover:bg-(--blue-dark-light)"
                                          >
                                            <MaskIcon src="/icons/trash-2.svg" size={16} />
                                            {deletingId === p.id ? 'Deleting…' : 'Delete'}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-10 text-center text-sm text-(--gray-normal)"
                            >
                              No documents found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                ) :
                  (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: 16,
                        padding: 8,
                        borderRadius: 12,
                      }}
                    >

                      {!activeFolder && folders.map((folder) => {
                        const isOpen = openFolderId === folder.id;
                        return (

                          <div
                            key={folder.id}
                            ref={(el) => {
                              folderDropdownRefs.current[folder.id] = el;
                            }}
                            onClick={() => {
                              setActiveFolder(folder);
                              setSearch('');
                              setOpenFolderId(null);
                            }}
                            className=" relative overflow-hidden p-4  h-[284px] rounded-xl bg-(--soft-white-light) group cursor-pointer"

                          >



                            <div className='relative '>
                              {/* Top 3-dot Menu Icon */}
                              <div className="absolute right-0  flex justify-end z-50">
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenFolderId(isOpen ? null : folder.id);
                                  }}
                                >                                  <MaskIcon src='icons/dots.svg' color='var(--soft-white-dark-active)' size={18} />
                                </button>
                              </div>

                              {/* Folder dropdown menu */}
                              {
                                openFolderId === folder.id && (
                                  <div className='absolute bg-(--soft-white-light-active) w-[264px] right-0 top-5 flex flex-col p-3 rounded-lg border border-(--white-light-hover) z-50'>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      className='p-2 rounded-lg flex gap-1 hover:bg-(--blue-dark-light) cursor-pointer'
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        setActiveFolder(folder);
                                        setSearch('');
                                        setOpenFolderId(null);
                                      }}
                                    >
                                      <MaskIcon src='/icons/folder-01.svg' size={20} color='var(--gray-dark-hover)' />
                                      <span className='text-[14px] text-(--gray-dark-hover) font-medium'>
                                        Open Folder
                                      </span>
                                    </div>

                                    <div className='p-2 rounded-lg flex gap-1 hover:bg-(--blue-dark-light)'
                                      onClick={() => {
                                        // Handle open folder logic here
                                        setOpenFolderId(null); // close dropdown on click
                                      }}
                                    >
                                      <MaskIcon src='/icons/download-01.svg' size={20} color='var(--gray-dark-hover)' />
                                      <span className='text-[14px] text-(--gray-dark-hover) font-medium'>Download all files</span>
                                    </div>

                                  </div>
                                )
                              }

                              {/* Stacked Documents Illustration */}
                              <div className="relative h-44 flex items-center justify-center my-1 ">

                                <div
                                  className="absolute z-[1] top-6 left-4"
                                >
                                  <img src="/icons/file-bg-02.svg" height={'132px'} width={'113px'} alt="File" />
                                </div>
                                <div className='absolute w-[125px]  z-2 flex flex-col p-3 gap-3 -rotate-5 bg-(--soft-white-light-active) top-4 left-15' style={{ boxShadow: '0px 1px 4px 0px #0000001A' }}>

                                  <div className='flex flex-wrap'>
                                    <h1 className='text-[14px] text-center font-semibold'>{folder.name}</h1>
                                  </div>
                                  <img src="/icons/file-bg-01.svg" height={'132px'} width={'113px'} alt="" />
                                </div>
                                <div className='absolute p-0   z-1 top-11 left-30' >
                                  <img src="/icons/file-bg-03.svg" height={'132px'} width={'113px'} alt="" className='' />
                                </div>



                              </div>

                              {/* Folder Container / Bottom Section */}
                              <div className="relative  h-[148px] overflow-hidden bottom-18 z-5 flex flex-col gap-2">
                                <img src="/icons/folder-bg.svg" alt="" height={'148px'} />
                                <div className="absolute  top-6 left-3 right-3 bottom-2 overflow-hidden flex flex-col gap-2">
                                  <div className="flex h-17 flex-col gap-1 min-w-0">
                                    <h3 className="text-[14px] font-semibold text-(--neutral-normal) break-words line-clamp-2 leading-5">
                                      {folder.name}
                                    </h3>

                                    <p className="text-[11px] text-(--gray-dark) break-words line-clamp-3 leading-4">
                                      {folder.description || "No description provided."}
                                    </p>
                                  </div>

                                  {/* File Count & Arrow Action Button */}
                                  <div className="flex  items-center justify-between  w-full">
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-[32px] font-extrabold text-(--neutral-dark) tracking-tight">
                                        {
                                          policies.filter(policy => policy.folder_path === folder.name).length
                                        }
                                      </span>
                                      <span className="text-[12px] font-medium text-(--gray-normal)">Files</span>
                                    </div>
                                    <div className='h-7 w-7 bg-(--gray-light-hover) flex justify-center items-center rounded-full'>
                                      <MaskIcon src='/icons/chevron-right.svg' color='var(--neutral-normal)' size={16} />
                                    </div>
                                  </div>


                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                      }



                      {filteredPolicies.map(p => {
                        const ack = ackFor(p.id);
                        const filename = p.title.toLowerCase().endsWith('.pdf')
                          ? p.title
                          : `${p.title}.pdf`;
                        const isSelected = selectedPolicyIds?.includes(p.id);

                        return (
                          <article
                            key={p.id}
                            style={{
                              position: 'relative',
                              zIndex: 0,
                              padding: 12,
                              background: isSelected ? '#EBF5FB' : 'var(--white-light)',
                              border: isSelected ? '1px solid #26759F' : '1px solid #E8EAEE',
                              borderRadius: 14,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                height: 28,
                                marginBottom: 10,
                              }}
                            >
                              <PdfIcon />
                              <span
                                title={filename}
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: 'var(--gray-dark-active)',
                                  fontSize: 13,
                                  fontWeight: 500,
                                }}
                              >
                                {filename}
                              </span>

                              {isSelected ? (
                                <button
                                  type="button"
                                  aria-label="Unselect file"
                                  onClick={() => toggleSelectPolicy(p.id)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 0,
                                    borderRadius: 6,
                                    background: 'transparent',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {/* <img
                                  src="/icons/square-check.svg"
                                  alt="Selected"
                                  style={{ width: 20, height: 20 }}
                                /> */}
                                  <input type="checkbox" checked />
                                </button>
                              ) : (
                                <div
                                  ref={activeDropdown === p.id ? dropdownRef : null}
                                  style={{ position: 'relative', flexShrink: 0 }}
                                >
                                  <button
                                    type="button"
                                    aria-label={`Actions for ${p.title}`}
                                    aria-expanded={activeDropdown === p.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdown(prev => prev === p.id ? null : p.id);
                                    }}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: 0,
                                      borderRadius: 6,
                                      background: 'transparent',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span
                                      className="inline-block h-6 w-6 bg-(--gray-normal)"
                                      style={{
                                        WebkitMaskImage: 'url(/icons/dots-menu.svg)',
                                        maskImage: 'url(/icons/dots-menu.svg)',
                                        WebkitMaskRepeat: 'no-repeat',
                                        maskRepeat: 'no-repeat',
                                        WebkitMaskPosition: 'center',
                                        maskPosition: 'center',
                                        WebkitMaskSize: 'contain',
                                        maskSize: 'contain',
                                      }}
                                    />
                                  </button>

                                  {activeDropdown === p.id && (
                                    <div
                                      className="absolute right-0 top-full mt-1 w-[220px] bg-(--soft-white-light-active) border border-(--white-light-hover) rounded-lg z-[100] p-2 text-left shadow-lg"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {isAdmin && !activeFolder && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            toggleSelectPolicy(p.id);
                                            setActiveDropdown(null);
                                          }}
                                          className="flex items-center gap-3 w-full p-2 rounded-lg text-[14px] font-medium text-(--gray-dark-hover) hover:bg-(--blue-dark-light)"
                                        >
                                          <img src="/icons/square-check.svg" alt="" className="w-5 h-5" />
                                          Select
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          previewPolicy(p);
                                          setActiveDropdown(null);
                                        }}
                                        className="flex items-center gap-3 w-full p-2 rounded-lg text-[14px] font-medium text-(--gray-dark-hover) hover:bg-(--blue-dark-light)"
                                      >
                                        <img src="/icons/eye.svg" alt="" className="w-5 h-5" />
                                        Preview
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => downloadPolicy(p)}
                                        className="flex items-center gap-3 w-full p-2 rounded-lg text-[14px] font-medium text-(--gray-dark-hover) hover:bg-(--blue-dark-light)"
                                      >
                                        <img src="/icons/download.svg" alt="" className="w-5 h-5" />
                                        Download
                                      </button>

                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdown(null);
                                            handleDelete(p);
                                          }}
                                          disabled={deletingId === p.id}
                                          className="flex items-center gap-3 w-full p-2 rounded-lg text-[14px] font-medium text-(--gray-dark-hover) hover:bg-(--blue-dark-light)"
                                        >
                                          <MaskIcon src="/icons/trash-2.svg" size={20} />
                                          {deletingId === p.id ? 'Deleting…' : 'Delete'}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                position: 'relative',
                                height: 218,
                                overflow: 'hidden',
                                border: '1px solid #E7EDF3',
                                borderRadius: 8,
                                background: 'var(--white-light)',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => previewPolicy(p)}
                                disabled={previewLoading}
                                aria-label={`Preview ${p.title}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  padding: 0,
                                  border: 0,
                                  background: 'transparent',
                                  cursor: 'pointer',
                                }}
                              >
                                {thumbnailUrls[p.id] ? (
                                  <PdfThumbnail url={thumbnailUrls[p.id]} />
                                ) : (<div className='flex justify-center items-center'> <PdfIcon /> </div>)}
                              </button>

                              {/* {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => togglePin(p)}
                                  disabled={pinningId === p.id}
                                  title={p.is_pinned ? 'Unpin' : 'Pin to top'}
                                  style={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    border: 0,
                                    background: p.is_pinned ? 'var(--color-primary)' : 'rgba(255,255,255,0.9)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  📌
                                </button>
                              ) : p.is_pinned ? (
                                <span
                                  title="Pinned"
                                  style={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    width: 26,
                                    height: 26,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                  }}
                                >
                                  📌
                                </span>
                              ) : null} */}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )
              }
            </>

          )}

      </div>

      {/* ── PDF preview modal ───────────────────────────────────────────── */}

      {
        previewFor && (
          <div
            className="modal-overlay"
            onClick={closePreview}
          >
            <div
              className="modal"
              style={{
                maxWidth: 860,
                width: '100%',
                height: 'min(720px, calc(100vh - 96px))',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{previewFor.title}</h2>

                <button
                  className="modal-close"
                  onClick={closePreview}
                >
                  ×
                </button>
              </div>

              <iframe
                src={`${previewFor.url}#toolbar=0&navpanes=0`}
                title={previewFor.title}
                style={{
                  flex: 1,
                  width: '100%',
                  border: 'none',
                  background: 'var(--color-bg)',
                }}
              />
            </div>
          </div>
        )
      }

      {/* Create folder popup  */}

      {
        selectedPolicyIds.length > 0 && (
          <div className='fixed left-0 right-0 bottom-10 bg-transparent w-full  flex justify-center z-20 '>
            <div className='flex py-2 px-5 gap-12 bg-(--neutral-light) rounded-[50px] items-center'>
              <div className='text-[14px] font-semibold text-(--blue-dark-darker)'>
                <span>{selectedPolicyIds.length}</span>
                <span> documents selected</span>
              </div>
              <div className='flex gap-1 items-center'>
                <Button variant='text' size='xs' leftIcon={<MaskIcon src='/icons/folder-01.svg' size={14} />} onClick={(e) => setShowCreateFolder(true)}>Create Folder</Button>

                <span className='border-r border-(--soft-white-dark-hover) h-4'></span>

                <Button variant='text' size='xs' leftIcon={<MaskIcon src='/icons/cross-outline.svg' size={14} />} onClick={() => setSelectedPolicyIds([])}
                >Cancel</Button>
              </div>

            </div>
          </div>
        )
      }

      {/* Create new folder */}
      {
        showCreateFolder && (
          <div className="modal-overlay">
            <div className=' flex flex-col w-[601px] p-6 rounded-xl gap-4 bg-(--soft-white-light) '>
              <div className='flex flex-col gap-6 '>
                <div className='flex justify-between items-start'>
                  <div>
                    <h3 className='text-[20px] font-semibold text-(--neutral-dark)'>Create New Folder</h3>
                    <p className='text-[14px] text-(--gray-dark)'>Group related documents and make them easier to find.</p>
                  </div>
                  <button onClick={() => setShowCreateFolder(false)}>
                    <MaskIcon src='/icons/cross-outline.svg' size={20} />
                  </button>
                </div>
                <div className='flex flex-col gap-3'>
                  <div className='flex flex-col gap-2'>
                    <label className='text-[16px] font-medium text-(--gray-dark-active)' htmlFor="folder-name">Folder Name</label>
                    <InputField
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      id='folder-name' placeholder='Enter folder name' required />
                  </div>
                  <div className='flex flex-col gap-2'>
                    <label className='text-[16px] font-medium text-(--gray-dark-active)' htmlFor="folder-description">Folder Description</label>
                    <textarea
                      value={folderDescription}
                      onChange={(e) => setFolderDescription(e.target.value)}
                      id='folder-description'
                      placeholder='Click to add description'
                      rows={5}
                      maxLength={500}
                      className='py-2 px-4 text-[16px] border
                    rounded-[5px]   border-(--soft-white-dark-hover) hover:border-(--blue-dark-normal)' required
                    />
                    <p className='text-[12px] text-(--gray-dark)'>Maximum 500 characters allowed.
                      <span>{' '}({folderDescription.length}/500)</span>
                    </p>

                  </div>

                </div>
              </div>
              <div className='flex justify-end'>
                <Button size='small' onClick={createFolder}>
                  Create
                </Button>
              </div>

            </div>
          </div>
        )
      }

      {/* ── Submissions review modal ────────────────────────────────────── */}

      {
        reviewFor && (
          <div className="modal-overlay" onClick={() => setReviewFor(null)}>
            <div
              className="modal"
              style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >

              <div className="modal-header">
                <h2>Submissions — {reviewFor.title}</h2>
                <Button variant='text' size='small' onClick={() => setReviewFor(null)}>X</Button>
              </div>

              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {submissionsLoading ? (
                  <p className="text-muted" style={{ fontSize: 13.5 }}>Loading…</p>
                ) : submissions.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: 13.5 }}>No one has submitted a signed copy yet.</p>
                ) : (
                  submissions.map(sub => {
                    const badgeClass = sub.status === 'approved' ? 'badge-success'
                      : sub.status === 'rejected' ? 'badge-error' : 'badge-warning';
                    const badgeLabel = sub.status === 'approved' ? 'Approved'
                      : sub.status === 'rejected' ? 'Rejected' : 'Pending Review';
                    return (
                      <div key={sub.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12 }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          onClick={() => reviewFor && previewSubmission(sub, reviewFor.title)}
                          title="Preview signed copy"
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{sub.employee_name}</div>
                            <div className="text-muted" style={{ fontSize: 11.5 }}>
                              {sub.employee_email} · Submitted {fmtDate(sub.submitted_at)}
                            </div>
                          </div>
                          <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>

                          <a
                            href={`${BACKEND}/uploads/policy-acks/${sub.signed_file_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{ textDecoration: 'none' }}
                          >
                            Download
                          </a>

                          {sub.status !== 'approved' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => approveSubmission(sub)}
                              disabled={reviewingId === sub.id}
                            >
                              Approve
                            </button>
                          )}

                          {sub.status !== 'rejected' && rejectingId !== sub.id && (

                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => { setRejectingId(sub.id); setRejectReason(''); }}
                              disabled={reviewingId === sub.id}
                            >
                              Reject
                            </button>
                          )}
                        </div>

                        {rejectingId === sub.id && (

                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <textarea
                              className="form-input"
                              placeholder="Reason for rejection (sent to the employee by email)"
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              rows={2}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => rejectSubmission(sub)}
                                disabled={!rejectReason.trim() || reviewingId === sub.id}
                              >
                                {reviewingId === sub.id ? 'Rejecting…' : 'Confirm Reject'}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setRejectingId(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                        {sub.status === 'rejected' && sub.rejection_reason && rejectingId !== sub.id && (
                          <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 8 }}>
                            Reason: {sub.rejection_reason}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        )
      }




    </div >
  );
}
