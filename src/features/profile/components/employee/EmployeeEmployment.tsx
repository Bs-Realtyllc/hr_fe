'use client'

import Button from "@/components/ui/Button/Button"
import InputField from "@/components/ui/InputField/InputField"
import { useEffect, useState } from "react"
import { profileService } from "@/features/profile/api/profileService"
import type { Profile } from "@/types"
import { BSRealtyDropdown } from "@bsrealtyllc/design-system"
import { api } from "@/lib/api"

interface DDType {
  id: number;
  name: string;
}
interface Option {
    value: string;
    label:string;
}
interface EmployeesType{
  id: number;
  name: string;
}

const dropdownFormat = (arr: DDType[]) => {
  return arr.map(({ id, name }) => ({
    value: String(id),
    label: name,
  }));

};



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
    const [designationOption, setDesignationOption] = useState<Option[]>([]);
    const [departmentOption, setDepartmentOption] = useState<Option[]>([]);
    const [employeesOption, setEmployeesOption] = useState<Option[]>([])


    const getLabelFromValue = (
      arr: Option[],
      id: string
    ) => {
      return arr.find((d) => d.value === String(id))?.label ?? '';
    };

    // Fetch profile data on mount
    useEffect(() => {
        async function loadProfileData() {
            try {
                setLoading(true);
                        const [data, designations, departments, employees] =
                          await Promise.all([
                            profileService.getProfile(),
                            api.get<DDType[]>("/designations"),
                            api.get<DDType[]>("/departments"),
                            api.get<EmployeesType []>('/employees/names/staff')
                          ]);
                        setDepartmentOption(dropdownFormat(departments))
                        setDesignationOption(dropdownFormat(designations))
                        setEmployeesOption(dropdownFormat(employees))



                setEmploymentDetails({
                    employmentId: (data as any).employee_id || (data as any).emp_id || '',
                    jobTitle: (data as any).designation_id || '',
                    department: (data as any).department_id || '',
                    startDate: (data as any).start_date || (data as any).joining_date || '',
                    workHours: (data as any).work_hours,
                });

                setOrgInfo({
                    reportingManager: (data as any).manager_id || '',
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
                designation_id: Number(employmentDetails.jobTitle),
                department_id: Number(employmentDetails.department),
                // start_date: employmentDetails.startDate,
                work_hours: employmentDetails.workHours,
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
                manager_id: Number(orgInfo.reportingManager),
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

            {/* Job Title */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="job-title"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Job Title
              </label>
              {isEditingEmployment ? (
                <div className="w-60">
                  <BSRealtyDropdown
                    className="w-full!"
                    options={designationOption}
                    placeholder="Select Job title"
                    value={String(employmentDetails.jobTitle)}
                    onChange={(selected) =>
                      setEmploymentDetails({
                        ...employmentDetails,
                        jobTitle: selected,
                      })
                    }
                  />
                </div>
              ) : (
                <p className="text-[14px] font-medium text-(--white-darker)">
                  {getLabelFromValue(
                    designationOption,
                    employmentDetails.jobTitle,
                  ) || "-"}
                </p>
              )}
            </div>

            {/* Department */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="department"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Department
              </label>
              {isEditingEmployment ? (
                <div className="w-60">
                  <BSRealtyDropdown
                    className="w-full!"
                    options={departmentOption}
                    placeholder="Select Job title"
                    value={String(employmentDetails.department)}
                    onChange={(selected) =>
                      setEmploymentDetails({
                        ...employmentDetails,
                        department: selected,
                      })
                    }
                  />
                </div>
              ) : (
                <p className="text-[14px] font-medium text-(--white-darker)">
                  {getLabelFromValue(
                    departmentOption,
                    employmentDetails.department,
                  ) || "-"}
                </p>
              )}
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
            {/* Reporting Manager */}
            <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
              <label
                htmlFor="reporting-manager"
                className="text-[14px] font-medium text-(--gray-darker)"
              >
                Reporting Manager
              </label>
              {isEditingOrg ? (
                <div className="w-60">
                  {/* <InputField
                    className="h-9! text-end!"
                    id="reporting-manager"
                    type="text"
                    value={orgInfo.reportingManager}
                    onChange={(e) =>
                      setOrgInfo({
                        ...orgInfo,
                        reportingManager: e.target.value,
                      })
                    }
                  /> */}
                  <BSRealtyDropdown
                    className="w-full!"
                    options={employeesOption}
                    placeholder="Select a manager"
                    value={String(orgInfo.reportingManager)}
                    onChange={(selected) =>
                      setOrgInfo({ ...orgInfo, reportingManager: selected })
                    }
                  />
                </div>
              ) : (
                <p className="text-[14px] font-medium text-(--white-darker)">
                  {getLabelFromValue(
                    employeesOption,
                    orgInfo.reportingManager,
                  ) || "-"}{" "}
                </p>
              )}
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