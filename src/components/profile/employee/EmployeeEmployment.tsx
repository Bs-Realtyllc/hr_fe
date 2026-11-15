'use client'

import Button from "@/components/Button/Button"
import InputField from "@/components/InputField/InputField"
import { useEffect, useState } from "react"
import { profileService, Profile } from "@/lib/profileService"
import { BSRealtyDropdown } from "@bsrealtyllc/design-system"

const EmployeeEmployment = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // 1. Employment Details State & Toggle
    const [employmentDetails, setEmploymentDetails] = useState({
        employmentId: '',
        jobTitle: '',
        department: '',
        startDate: '',
        employeeType: '',
    })
    const [isEditingEmployment, setIsEditingEmployment] = useState(false)

    // 2. Organization & Reporting State & Toggle
    const [orgInfo, setOrgInfo] = useState({
        reportingManager: '',
        workLocation: '',
    })
    const [isEditingOrg, setIsEditingOrg] = useState(false)

    // Fetch profile data on mount
    useEffect(() => {
        async function loadProfileData() {
            try {
                setLoading(true);
                const data = await profileService.getProfile();
                console.log("Fetched Profile Data:", data);

                setEmploymentDetails({
                    employmentId: (data as any).employee_id || (data as any).emp_id || '',
                    jobTitle: (data as any).job_title || (data as any).designation || '',
                    department: (data as any).department || '',
                    startDate: (data as any).start_date || (data as any).joining_date || '',
                    employeeType: (data as any).employee_type || (data as any).emp_type || '',
                });

                setOrgInfo({
                    reportingManager: (data as any).reporting_manager || (data as any).manager || '',
                    workLocation: (data as any).work_location || (data as any).location || '',
                });
            } catch (err: any) {
                setError(err.message || "Failed to load employment data");
            } finally {
                setLoading(false);
            }
        }
        loadProfileData();
    }, []);

    // Handlers for saving each section
    const handleSaveEmployment = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await profileService.updateProfile({
                employee_id: employmentDetails.employmentId,
                job_title: employmentDetails.jobTitle,
                department: employmentDetails.department,
                start_date: employmentDetails.startDate,
                employee_type: employmentDetails.employeeType,
            } as any);
            console.log("Updated Employment Details:", employmentDetails)
            setIsEditingEmployment(false)
        } catch (err: any) {
            alert(err.message || "Failed to update employment details");
        }
    }

    const handleSaveOrg = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await profileService.updateProfile({
                reporting_manager: orgInfo.reportingManager,
                work_location: orgInfo.workLocation,
            } as any);
            console.log("Updated Organization Details:", orgInfo)
            setIsEditingOrg(false)
        } catch (err: any) {
            alert(err.message || "Failed to update organization details");
        }
    }

    if (loading) return <div className="p-4 text-gray-500">Loading employment data...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

    // Reusable Icon Renderer
    const renderMaskIcon = (iconPath: string, size = '14px') => (
        <span style={{
            display: 'inline-block',
            width: size,
            height: size,
            backgroundColor: 'currentColor',
            maskImage: `url(${iconPath})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskImage: `url(${iconPath})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat'
        }} />
    );

    return (
        <div className="flex flex-col gap-4">

            {/* Employment Details */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
                            {renderMaskIcon('/icons/user.svg', '20px')}
                        </div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Employment Details</h1>
                    </div>
                    <div>
                        <Button
                            className="text-(--blue-dark-normal)!"
                            variant="text"
                            size="xs"
                            onClick={() => setIsEditingEmployment(!isEditingEmployment)}
                            leftIcon={renderMaskIcon('/icons/edit-4.svg')}
                        >
                            {isEditingEmployment ? "Cancel" : "Edit"}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSaveEmployment}>
                    {/* Employment ID */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="emp-id" className="text-[14px] font-medium text-(--gray-darker)">
                            Employment ID
                        </label>
                        {isEditingEmployment ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="emp-id"
                                    type="text"
                                    value={employmentDetails.employmentId}
                                    onChange={(e) => setEmploymentDetails({ ...employmentDetails, employmentId: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{employmentDetails.employmentId || '-'}</p>
                        )}
                    </div>

                    {/* Job Title */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="job-title" className="text-[14px] font-medium text-(--gray-darker)">
                            Job Title
                        </label>
                        {isEditingEmployment ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="job-title"
                                    type="text"
                                    value={employmentDetails.jobTitle}
                                    onChange={(e) => setEmploymentDetails({ ...employmentDetails, jobTitle: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{employmentDetails.jobTitle || '-'}</p>
                        )}
                    </div>

                    {/* Department */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="department" className="text-[14px] font-medium text-(--gray-darker)">
                            Department
                        </label>
                        {isEditingEmployment ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="department"
                                    type="text"
                                    value={employmentDetails.department}
                                    onChange={(e) => setEmploymentDetails({ ...employmentDetails, department: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{employmentDetails.department || '-'}</p>
                        )}
                    </div>

                    {/* Start Date */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="start-date" className="text-[14px] font-medium text-(--gray-darker)">
                            Start Date
                        </label>
                        {isEditingEmployment ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="start-date"
                                    type="date"
                                    value={employmentDetails.startDate}
                                    onChange={(e) => setEmploymentDetails({ ...employmentDetails, startDate: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{employmentDetails.startDate || '-'}</p>
                        )}
                    </div>

                    {/* Employee Type */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="emp-type" className="text-[14px] font-medium text-(--gray-darker)">
                            Employee Type
                        </label>
                        {isEditingEmployment ? (
                            <div className="w-60 pb-1">
                                <BSRealtyDropdown
                                    className="w-60! text-end!"
                                    value={employmentDetails.employeeType}
                                    onChange={(val: string) => setEmploymentDetails({ ...employmentDetails, employeeType: val })}
                                    options={[
                                        { label: 'Full-Time', value: 'full_time' },
                                        { label: 'Part-Time', value: 'part_time' },
                                        { label: 'Contract', value: 'contract' },
                                        { label: 'Internship', value: 'internship' }
                                    ]}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker) capitalize">
                                {employmentDetails.employeeType ? employmentDetails.employeeType.replace('_', '-') : '-'}
                            </p>
                        )}
                    </div>

                    {isEditingEmployment && (
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="submit" size="xs">Save Changes</Button>
                        </div>
                    )}
                </form>
            </div>

            {/* Organization & Reporting */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
                            {renderMaskIcon('/icons/building-office-2.svg', '20px')}
                        </div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Organization & Reporting</h1>
                    </div>
                    <div>
                        <Button
                            className="text-(--blue-dark-normal)!"
                            variant="text"
                            size="xs"
                            onClick={() => setIsEditingOrg(!isEditingOrg)}
                            leftIcon={renderMaskIcon('/icons/edit-4.svg')}
                        >
                            {isEditingOrg ? "Cancel" : "Edit"}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSaveOrg}>
                    {/* Reporting Manager */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="reporting-manager" className="text-[14px] font-medium text-(--gray-darker)">
                            Reporting Manager
                        </label>
                        {isEditingOrg ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="reporting-manager"
                                    type="text"
                                    value={orgInfo.reportingManager}
                                    onChange={(e) => setOrgInfo({ ...orgInfo, reportingManager: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{orgInfo.reportingManager || '-'}</p>
                        )}
                    </div>

                    {/* Work Location */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="work-location" className="text-[14px] font-medium text-(--gray-darker)">
                            Work Location <span className="text-(--gray-normal)">(optional)</span>
                        </label>
                        {isEditingOrg ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="work-location"
                                    type="text"
                                    value={orgInfo.workLocation}
                                    onChange={(e) => setOrgInfo({ ...orgInfo, workLocation: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{orgInfo.workLocation || '-'}</p>
                        )}
                    </div>

                    {isEditingOrg && (
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="submit" size="xs">Save Changes</Button>
                        </div>
                    )}
                </form>
            </div>

        </div>
    )
}

export default EmployeeEmployment