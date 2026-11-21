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
        workHours: '',
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

                setEmploymentDetails({
                    employmentId: (data as any).employee_id || (data as any).emp_id || '',
                    jobTitle: (data as any).designation || '',
                    department: (data as any).department || '',
                    startDate: (data as any).start_date || (data as any).joining_date || '',
                    workHours: (data as any).work_hours,
                });

                setOrgInfo({
                    reportingManager: (data as any).manager_name || '',
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

    // Job title, department, and reporting manager are set by HR via the
    // employee's assigned Position, not editable here — only work hours and
    // work location remain self-service.
    const handleSaveEmployment = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await profileService.updateProfile({
                work_hours: employmentDetails.workHours,
            } as any);
            setIsEditingEmployment(false)
        } catch (err: any) {
            alert(err.message || "Failed to update employment details");
        }
    }

    const handleSaveOrg = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await profileService.updateProfile({
                work_location: orgInfo.workLocation,
            } as any);
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
      <div className="flex flex-col gap-4 mb-20">
        {/* Employment Details */}
        <div className="flex flex-col gap-4 p-3">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
                {renderMaskIcon("/icons/user.svg", "20px")}
              </div>
              <h1 className="text-[16px] font-semibold text-(--gray-darker)">
                Employment Details
              </h1>
            </div>
            <div>
              <Button
                className="text-(--blue-dark-normal)!"
                variant="text"
                size="xs"
                onClick={() => setIsEditingEmployment(!isEditingEmployment)}
                leftIcon={renderMaskIcon("/icons/edit-4.svg")}
              >
                {isEditingEmployment ? "Cancel" : "Edit"}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSaveEmployment}>
            {/* Employment ID */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="emp-id"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Employment ID
              </label>
              {isEditingEmployment ? (
                <div className="w-60">
                  <InputField
                    className="h-9! text-end!"
                    id="emp-id"
                    type="text"
                    value={employmentDetails.employmentId}
                    onChange={(e) =>
                      setEmploymentDetails({
                        ...employmentDetails,
                        employmentId: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <p className="text-[14px] font-medium text-(--white-darker)">
                  {employmentDetails.employmentId || "-"}
                </p>
              )}
            </div>

            {/* Job Title — set via Position assignment by HR, not self-editable */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="job-title"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Job Title
              </label>
              <p className="text-[14px] font-medium text-(--white-darker)">
                {employmentDetails.jobTitle || "-"}
              </p>
            </div>

            {/* Department — set via Position assignment by HR, not self-editable */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="department"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Department
              </label>
              <p className="text-[14px] font-medium text-(--white-darker)">
                {employmentDetails.department || "-"}
              </p>
            </div>

            {/* Start Date */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="start-date"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Start Date
              </label>
              {isEditingEmployment ? (
                <div className="w-60">
                  <InputField
                    className="h-9! text-end!"
                    id="start-date"
                    type="date"
                    disabled
                    value={employmentDetails.startDate}
                    onChange={(e) =>
                      setEmploymentDetails({
                        ...employmentDetails,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <p className="text-[14px] font-medium text-(--white-darker)">
                  {employmentDetails.startDate || "-"}
                </p>
              )}
            </div>

            {/* Employee Type */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="emp-type"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Work hours
              </label>
              {isEditingEmployment ? (
                <div className="w-60 pb-1">
                  <InputField
                    className="w-60! text-end!"
                    value={employmentDetails.workHours}
                    onChange={(e) =>
                      setEmploymentDetails({
                        ...employmentDetails,
                        workHours: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <p className="text-[14px] font-medium text-(--white-darker) capitalize">
                  {employmentDetails.workHours
                    ? employmentDetails.workHours.replace("_", "-")
                    : "-"}
                </p>
              )}
            </div>

            {isEditingEmployment && (
              <div className="flex justify-end gap-2 mt-4">
                <Button type="submit" size="xs">
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Organization & Reporting */}
        <div className="flex flex-col gap-4 p-3">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
                {renderMaskIcon("/icons/building-office-2.svg", "20px")}
              </div>
              <h1 className="text-[16px] font-semibold text-(--gray-darker)">
                Organization & Reporting
              </h1>
            </div>
            <div>
              <Button
                className="text-(--blue-dark-normal)!"
                variant="text"
                size="xs"
                onClick={() => setIsEditingOrg(!isEditingOrg)}
                leftIcon={renderMaskIcon("/icons/edit-4.svg")}
              >
                {isEditingOrg ? "Cancel" : "Edit"}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSaveOrg}>
            {/* Reporting Manager — derived from Position assignment by HR, not self-editable */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="reporting-manager"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Reporting Manager
              </label>
              <p className="text-[14px] font-medium text-(--white-darker)">
                {orgInfo.reportingManager || "-"}
              </p>
            </div>

            {/* Work Location */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="work-location"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Work Location{" "}
                <span className="text-(--gray-normal)">(optional)</span>
              </label>
              {isEditingOrg ? (
                <div className="w-60">
                  <BSRealtyDropdown
                    className="w-full!"
                    options={[{value:"onsite", label:"Onsite"},{value:"remote", label:"Remote"},{value:"hybrid", label:"Hybrid"}]}
                    placeholder="Select a work location"
                    value={orgInfo.workLocation}
                    onChange={(selected) =>
                      setOrgInfo({ ...orgInfo, workLocation: selected })
                    }
                  />
                </div>
              ) : (
                <p className="text-[14px] font-medium text-(--white-darker)">
                  {orgInfo.workLocation || "-"}
                </p>
              )}
            </div>

            {isEditingOrg && (
              <div className="flex justify-end gap-2 mt-4">
                <Button type="submit" size="xs">
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
}

export default EmployeeEmployment