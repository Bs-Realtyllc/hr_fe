"use client";

import Button from "@/components/ui/Button/Button";
import InputField from "@/components/ui/InputField/InputField";
import { useEffect, useRef, useState } from "react";
import { profileService } from "@/features/profile/api/profileService";
import type { Gender, Profile } from "@/types";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";

const EmployeePersonalInformation = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Personal Info State & Toggle
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    dob: "",
    gender: "",
    nationality: "",
    discord_username: ''
  });
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);

  // 2. Contact Info State & Toggle
  const [contactInfo, setContactInfo] = useState({
    companyEmail: "",
    personalEmail: "",
    phone: "",
    currentAddress: "",
    permanentAddress: "",
  });
  const [isEditingContact, setIsEditingContact] = useState(false);

  // 3. Emergency Contact State & Toggle
  const [emergencyInfo, setEmergencyInfo] = useState({
    name: "",
    relationship: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);

  // fetch profile data
  useEffect(() => {
    async function loadProfileData() {
      try {
        setLoading(true);
        const data = await profileService.getProfile();
        setPersonalInfo({
          name: data.name || "",
          dob: data.dob || "",
          gender: data.gender || "",
          nationality: data.nationality || "",
          discord_username: data.discord_username || ""
        });

        setContactInfo({
          companyEmail: data.email || "",
          personalEmail: data.secondary_email || "",
          phone: data.phone || "",
          currentAddress: data.current_address || "",
          permanentAddress: data.permanent_address || "",
        });

        setEmergencyInfo({
          name: (data as any).emergency_contact_name || "",
          relationship: (data as any).emergency_contact_relation || "",
          email: (data as any).emergency_contact_email || "",
          phone: (data as any).emergency_contact_phone || "",
          address: (data as any).emergency_contact_address || "",
        });
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfileData();
  }, []);

  // Auto focus first input field when click on edit btn
  const personalNameRef = useRef<HTMLInputElement>(null);
  const companyEmailRef = useRef<HTMLInputElement>(null);
  const emergencyNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingPersonal) {
      personalNameRef.current?.focus();
    }
  }, [isEditingPersonal]);

  useEffect(() => {
    if (isEditingContact) {
      companyEmailRef.current?.focus();
    }
  }, [isEditingContact]);

  useEffect(() => {
    if (isEditingEmergency) {
      emergencyNameRef.current?.focus();
    }
  }, [isEditingEmergency]);

  // Handlers for saving each section
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await profileService.updateProfile({
        name: personalInfo.name,
        dob: personalInfo.dob,
        gender: personalInfo.gender as Gender,
        nationality: personalInfo.nationality,
        discord_username: personalInfo.discord_username,
      });
      console.log("Updated Personal Info:", personalInfo);
      setIsEditingPersonal(false);
    } catch (err: any) {
      alert(err.message || "Failed to update personal details");
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await profileService.updateProfile({
        email: contactInfo.companyEmail,
        secondary_email: contactInfo.personalEmail,
        phone: contactInfo.phone,
        current_address: contactInfo.currentAddress,
        permanent_address: contactInfo.permanentAddress,
      });
      console.log("Updated Contact Info:", contactInfo);
      setIsEditingContact(false);
    } catch (err: any) {
      alert(err.message || "Failed to update contact info");
    }
  };

  const handleSaveEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await profileService.updateProfile({
        emergency_contact_name: emergencyInfo.name,
        emergency_contact_relation: emergencyInfo.relationship,
        emergency_contact_email: emergencyInfo.email,
        emergency_contact_phone: emergencyInfo.phone,
        emergency_contact_address: emergencyInfo.address,
      });
      console.log("Updated Personal Info:", personalInfo);
      setIsEditingPersonal(false);
    } catch (err: any) {
      alert(err.message || "Failed to update personal details");
    }
    setIsEditingEmergency(false);
  };

  if (loading)
    return <div className="p-4 text-(--gray-normal)">Loading profile data...</div>;
  if (error) return <div className="p-4 text-(--error-normal)">Error: {error}</div>;

  // Reusable Icon Renderer
  const renderMaskIcon = (iconPath: string, size = "14px") => (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundColor: "currentColor",
        maskImage: `url(${iconPath})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskImage: `url(${iconPath})`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4 mb-20">
      {/* Personal detail */}
      <div className="flex flex-col gap-4 p-3">
        <div className="flex justify-between ">
          <div className="flex gap-2">
            <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
              {renderMaskIcon("/icons/user.svg", "20px")}
            </div>
            <h1 className="text-[16px] font-semibold text-(--gray-darker)">
              Personal Detail
            </h1>
          </div>
          <div>

            {isEditingPersonal ? (
              <div className="flex justify-end gap-2">
                <Button type="submit" size="xs" onClick={handleSavePersonal}>
                  Save Changes
                </Button>
              </div>
            ) : (
              <Button
                className="text-(--blue-dark-normal)!"
                variant="text"
                size="xs"
                onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                leftIcon={renderMaskIcon("/icons/edit-4.svg")}
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSavePersonal}>
          {/* Full Name */}
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="name"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Full Name
            </label>

            <div >
              <input ref={personalNameRef} id="name" type="text" className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                value={personalInfo.name} onChange={(e) =>
                  setPersonalInfo({ ...personalInfo, name: e.target.value })
                }
                disabled={!isEditingPersonal} />
            </div>

          </div>

          {/* DOB */}
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="dob"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Date of Birth
            </label>
            {isEditingPersonal ? (
              <div className="w-40 max-sm:w-full">
                <InputField
                  className="h-9! text-end!"
                  id="dob"
                  type="date"
                  value={personalInfo.dob}
                  onChange={(e) =>
                    setPersonalInfo({ ...personalInfo, dob: e.target.value })
                  }
                />
              </div>
            ) : (
              <p className="text-[14px] font-medium text-(--white-darker)">
                {personalInfo.dob || "-"}
              </p>
            )}
          </div>

          {/* Gender */}
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="gender"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Gender
            </label>
            {isEditingPersonal ? (
              <div className="pb-1">
                <BSRealtyDropdown
                  className="w-40! max-sm:w-full! [&_.bsr-dropdown\_input-wrapper]:h-9! [&_.bsr-dropdown\_input]:h-full! "
                  value={personalInfo.gender}
                  onChange={(val: string) =>
                    setPersonalInfo({ ...personalInfo, gender: val })
                  }
                  options={[
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Other", value: "other" },
                  ]}
                />
              </div>
            ) : (
              <p className="text-[14px] font-medium text-(--white-darker) capitalize">
                {personalInfo.gender || "-"}
              </p>
            )}
          </div>

          {/* Nationality */}
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="nationality"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Nationality
            </label>

            <div >
              <input id="nationality" type="text" className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                value={personalInfo.nationality}
                onChange={(e) =>
                  setPersonalInfo({
                    ...personalInfo,
                    nationality: e.target.value,
                  })
                }
                disabled={!isEditingPersonal} />
            </div>
          </div>

          {/* DIscord id */}
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="discord"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              DIscord Username
            </label>

            <div >
              <input id="discord" type="text" className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                value={personalInfo.discord_username}
                onChange={(e) =>
                  setPersonalInfo({
                    ...personalInfo,
                    discord_username: e.target.value,
                  })
                }
                disabled={!isEditingPersonal} />
            </div>
          </div>
        </form>
      </div>

      {/* Contact Information */}
      <div className="flex flex-col gap-4 p-3">
        <div className="flex justify-between ">
          <div className="flex gap-2">
            <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-[#4A6FA5]">
              {renderMaskIcon("/icons/mail.svg", "20px")}
            </div>
            <h1 className="text-[16px] font-semibold text-(--gray-darker)">
              Contact Information
            </h1>
          </div>
          <div>

            {isEditingContact ? (
              <div className="flex justify-end gap-2">
                <Button type="submit" size="xs" onClick={handleSaveContact}>
                  Save Changes
                </Button>
              </div>
            ) : (
              <Button
                className="text-(--blue-dark-normal)!"
                variant="text"
                size="xs"
                onClick={() => setIsEditingContact(!isEditingContact)}
                leftIcon={renderMaskIcon("/icons/edit-4.svg")}
              >
                Edit
              </Button>
            )}

          </div>
        </div>

        <form onSubmit={handleSaveContact}>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="comp-email"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Company email
            </label>

            <div>

              <input ref={companyEmailRef} id="comp-email" type="text" className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                value={contactInfo.companyEmail}
                onChange={(e) =>
                  setContactInfo({
                    ...contactInfo,
                    companyEmail: e.target.value,
                  })
                }
                disabled={!isEditingContact} />

            </div>

          </div>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="email"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Personal email
            </label>
            <div>
              <input id="email" type="text" className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                value={contactInfo.personalEmail}
                onChange={(e) =>
                  setContactInfo({
                    ...contactInfo,
                    personalEmail: e.target.value,
                  })
                }
                disabled={!isEditingContact} />

            </div>

          </div>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="phone"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Phone Number
            </label>
            <div>
              <input id="phone" type="text" className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                value={contactInfo.phone}
                onChange={(e) =>
                  setContactInfo({ ...contactInfo, phone: e.target.value })
                }
                disabled={!isEditingContact} />

            </div>
          </div>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="current-add"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Current Address
            </label>
            <div>
              <input id="current-add" type="text" className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                value={contactInfo.currentAddress}
                onChange={(e) =>
                  setContactInfo({
                    ...contactInfo,
                    currentAddress: e.target.value,
                  })
                }
                disabled={!isEditingContact} />
            </div>
          </div>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="permanent-add"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Permanent Address
            </label>
            <div>
              <input id="permanent-add" type="text" className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                value={contactInfo.permanentAddress}
                onChange={(e) =>
                  setContactInfo({
                    ...contactInfo,
                    permanentAddress: e.target.value,
                  })
                }
                disabled={!isEditingContact} />
            </div>

          </div>

        </form>
      </div>

      {/* Emergency Contact */}
      <div className="flex flex-col gap-4 p-3">
        <div className="flex justify-between ">
          <div className="flex gap-2">
            <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
              {renderMaskIcon("/icons/phone.svg", "20px")}
            </div>
            <h1 className="text-[16px] font-semibold text-(--gray-darker)">
              Emergency Contact
            </h1>
          </div>
          <div>
            {isEditingEmergency ? (
              <div className="flex justify-end gap-2">
                <Button type="submit" size="xs" onClick={handleSaveEmergency}>
                  Save Changes
                </Button>
              </div>
            ) : (<Button
              className="text-(--blue-dark-normal)!"
              variant="text"
              size="xs"
              onClick={() => setIsEditingEmergency(!isEditingEmergency)}
              leftIcon={renderMaskIcon("/icons/edit-4.svg")}
            >
              Edit
            </Button>)}

          </div>
        </div>

        <form onSubmit={handleSaveEmergency}>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="rel-name"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Full Name
            </label>
            <div>
              <input ref={emergencyNameRef} className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                id="rel-name"
                type="text"
                value={emergencyInfo.name}
                onChange={(e) =>
                  setEmergencyInfo({ ...emergencyInfo, name: e.target.value })
                }
                disabled={!isEditingEmergency} />
            </div>

          </div>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="relationship"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Relationship
            </label>
            <div>
              <input className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                id="relationship"
                type="text"
                value={emergencyInfo.relationship}
                onChange={(e) =>
                  setEmergencyInfo({
                    ...emergencyInfo,
                    relationship: e.target.value,
                  })
                }
                disabled={!isEditingEmergency} />
            </div>

          </div>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="rel-email"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Email
            </label>
            <div>
              <input className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                id="rel-email"
                type="text"
                value={emergencyInfo.email}
                onChange={(e) =>
                  setEmergencyInfo({
                    ...emergencyInfo,
                    email: e.target.value,
                  })
                }
                disabled={!isEditingEmergency} />
            </div>
          </div>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="rel-phone"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Phone Number
            </label>
            <div>
              <input className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                id="rel-phone"
                type="text"
                value={emergencyInfo.phone}
                onChange={(e) =>
                  setEmergencyInfo({
                    ...emergencyInfo,
                    phone: e.target.value,
                  })
                }
                disabled={!isEditingEmergency} />
            </div>
          </div>
          <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
            <label
              htmlFor="rel-phone"
              className="text-[14px] font-medium text-(--gray-darker)"
            >
              Address
            </label>
            <div>
              <input className="outline-none w-90 max-sm:w-full ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                id="rel-address"
                type="text"
                value={emergencyInfo.address}
                onChange={(e) =>
                  setEmergencyInfo({
                    ...emergencyInfo,
                    address: e.target.value,
                  })
                }
                disabled={!isEditingEmergency} />
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EmployeePersonalInformation;
