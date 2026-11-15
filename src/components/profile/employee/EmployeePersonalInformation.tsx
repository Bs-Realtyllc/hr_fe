'use client'

import Button from "@/components/Button/Button"
import InputField from "@/components/InputField/InputField"
import { useEffect, useState } from "react"
import { profileService, Profile } from "@/lib/profileService"
import { BSRealtyDropdown } from "@bsrealtyllc/design-system"

const EmployeePersonalInformation = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // 1. Personal Info State & Toggle
    const [personalInfo, setPersonalInfo] = useState({
        name: '',
        dob: '',
        gender: '',
        nationality: '',
    })
    const [isEditingPersonal, setIsEditingPersonal] = useState(false)

    // 2. Contact Info State & Toggle
    const [contactInfo, setContactInfo] = useState({
        companyEmail: '',
        personalEmail: '',
        phone: '',
        currentAddress: '',
        permanentAddress: '',
    })
    const [isEditingContact, setIsEditingContact] = useState(false)

    // 3. Emergency Contact State & Toggle
    const [emergencyInfo, setEmergencyInfo] = useState({
        name: '',
        relationship: '',
        email: '',
        phone: '',
    })
    const [isEditingEmergency, setIsEditingEmergency] = useState(false)

    // fetch profile data
    useEffect(() => {
        async function loadProfileData() {
            try {
                setLoading(true);
                const data = await profileService.getProfile();
                console.log("Fetched Profile Data:", data);

                setPersonalInfo({
                    name: data.name || '',
                    dob: data.dob || '',
                    gender: data.gender || '',
                    nationality: data.address || '',
                });

                setContactInfo({
                    companyEmail: data.email || '',
                    personalEmail: data.secondary_email || '',
                    phone: data.phone || '',
                    currentAddress: data.address || '',
                    permanentAddress: data.address || '',
                });

                setEmergencyInfo({
                    name: (data as any).emergency_name || '',
                    relationship: (data as any).emergency_relationship || '',
                    email: (data as any).emergency_email || '',
                    phone: (data as any).emergency_phone || '',
                });
            } catch (err: any) {
                setError(err.message || "Failed to load profile");
            } finally {
                setLoading(false);
            }
        }
        loadProfileData();
    }, []);

    // Handlers for saving each section
    const handleSavePersonal = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await profileService.updateProfile({
                name: personalInfo.name,
                dob: personalInfo.dob,
                gender: personalInfo.gender,
                address: personalInfo.nationality,
            });
            console.log("Updated Personal Info:", personalInfo)
            setIsEditingPersonal(false)
        } catch (err: any) {
            alert(err.message || "Failed to update personal details");
        }
    }

    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await profileService.updateProfile({
                email: contactInfo.companyEmail,
                secondary_email: contactInfo.personalEmail,
                phone: contactInfo.phone,
                address: contactInfo.currentAddress,
            });
            console.log("Updated Contact Info:", contactInfo)
            setIsEditingContact(false)
        } catch (err: any) {
            alert(err.message || "Failed to update contact info");
        }
    }

    const handleSaveEmergency = (e: React.FormEvent) => {
        e.preventDefault()
        console.log("Updated Emergency Info:", emergencyInfo)
        setIsEditingEmergency(false)
    }

    if (loading) return <div className="p-4 text-gray-500">Loading profile data...</div>;
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

            {/* Personal detail */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
                            {renderMaskIcon('/icons/user.svg', '20px')}
                        </div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Personal Detail</h1>
                    </div>
                    <div>
                        <Button
                            className="text-(--blue-dark-normal)!"
                            variant="text"
                            size="xs"
                            onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                            leftIcon={renderMaskIcon('/icons/edit-4.svg')}
                        >
                            {isEditingPersonal ? "Cancel" : "Edit"}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSavePersonal}>
                    {/* Full Name */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="name" className="text-[14px] font-medium text-(--gray-darker)">
                            Full Name
                        </label>
                        {isEditingPersonal ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="name"
                                    type="text"
                                    value={personalInfo.name}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{personalInfo.name || '-'}</p>
                        )}
                    </div>

                    {/* DOB */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="dob" className="text-[14px] font-medium text-(--gray-darker)">
                            Date of Birth
                        </label>
                        {isEditingPersonal ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="dob"
                                    type="date"
                                    value={personalInfo.dob}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, dob: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{personalInfo.dob || '-'}</p>
                        )}
                    </div>

                    {/* Gender */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="gender" className="text-[14px] font-medium text-(--gray-darker)">
                            Gender
                        </label>
                        {isEditingPersonal ? (
                            <div className="w-60 pb-1">
                                <BSRealtyDropdown
                                    className="w-60! [&_.bsr-dropdown\_input-wrapper]:h-9! [&_.bsr-dropdown\_input]:h-full! " value={personalInfo.gender}
                                    onChange={(val: string) => setPersonalInfo({ ...personalInfo, gender: val })}
                                    options={[
                                        { label: 'Male', value: 'male' },
                                        { label: 'Female', value: 'female' },
                                        { label: 'Other', value: 'other' }
                                    ]}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker) capitalize">{personalInfo.gender || '-'}</p>
                        )}
                    </div>

                    {/* Nationality */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="nationality" className="text-[14px] font-medium text-(--gray-darker)">
                            Nationality
                        </label>
                        {isEditingPersonal ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="nationality"
                                    type="text"
                                    value={personalInfo.nationality}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{personalInfo.nationality || '-'}</p>
                        )}
                    </div>
                    {isEditingPersonal && (
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="submit" size="xs">Save Changes</Button>
                        </div>
                    )}
                </form>
            </div>

            {/* Contact Information */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-[#4A6FA5]">
                            {renderMaskIcon('/icons/mail.svg', '20px')}
                        </div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Contact Information</h1>
                    </div>
                    <div>
                        <Button
                            className="text-(--blue-dark-normal)!"
                            variant="text"
                            size="xs"
                            onClick={() => setIsEditingContact(!isEditingContact)}
                            leftIcon={renderMaskIcon('/icons/edit-4.svg')}
                        >
                            {isEditingContact ? "Cancel" : "Edit"}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSaveContact}>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="comp-email" className="text-[14px] font-medium text-(--gray-darker)">
                            Company email
                        </label>
                        {isEditingContact ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="comp-email"
                                    type="text"
                                    value={contactInfo.companyEmail}
                                    onChange={(e) => setContactInfo({ ...contactInfo, companyEmail: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{contactInfo.companyEmail || '-'}</p>
                        )}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="email" className="text-[14px] font-medium text-(--gray-darker)">
                            Personal email
                        </label>
                        {isEditingContact ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="email"
                                    type="text"
                                    value={contactInfo.personalEmail}
                                    onChange={(e) => setContactInfo({ ...contactInfo, personalEmail: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{contactInfo.personalEmail || '-'}</p>
                        )}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="phone" className="text-[14px] font-medium text-(--gray-darker)">
                            Phone Number
                        </label>
                        {isEditingContact ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="phone"
                                    type="text"
                                    value={contactInfo.phone}
                                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{contactInfo.phone || '-'}</p>
                        )}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="current-add" className="text-[14px] font-medium text-(--gray-darker)">
                            Current Address
                        </label>
                        {isEditingContact ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="current-add"
                                    type="text"
                                    value={contactInfo.currentAddress}
                                    onChange={(e) => setContactInfo({ ...contactInfo, currentAddress: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{contactInfo.currentAddress || '-'}</p>
                        )}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="permanent-add" className="text-[14px] font-medium text-(--gray-darker)">
                            Permanent Address
                        </label>
                        {isEditingContact ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="permanent-add"
                                    type="text"
                                    value={contactInfo.permanentAddress}
                                    onChange={(e) => setContactInfo({ ...contactInfo, permanentAddress: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{contactInfo.permanentAddress || '-'}</p>
                        )}
                    </div>
                    {isEditingContact && (
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="submit" size="xs">Save Changes</Button>
                        </div>
                    )}
                </form>
            </div>

            {/* Emergency Contact */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
                            {renderMaskIcon('/icons/phone.svg', '20px')}
                        </div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Emergency Contact</h1>
                    </div>
                    <div>
                        <Button
                            className="text-(--blue-dark-normal)!"
                            variant="text"
                            size="xs"
                            onClick={() => setIsEditingEmergency(!isEditingEmergency)}
                            leftIcon={renderMaskIcon('/icons/edit-4.svg')}
                        >
                            {isEditingEmergency ? "Cancel" : "Edit"}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSaveEmergency}>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="rel-name" className="text-[14px] font-medium text-(--gray-darker)">
                            Full Name
                        </label>
                        {isEditingEmergency ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="rel-name"
                                    type="text"
                                    value={emergencyInfo.name}
                                    onChange={(e) => setEmergencyInfo({ ...emergencyInfo, name: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{emergencyInfo.name || '-'}</p>
                        )}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="relationship" className="text-[14px] font-medium text-(--gray-darker)">
                            Relationship
                        </label>
                        {isEditingEmergency ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="relationship"
                                    type="text"
                                    value={emergencyInfo.relationship}
                                    onChange={(e) => setEmergencyInfo({ ...emergencyInfo, relationship: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{emergencyInfo.relationship || '-'}</p>
                        )}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="rel-email" className="text-[14px] font-medium text-(--gray-darker)">
                            Email
                        </label>
                        {isEditingEmergency ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="rel-email"
                                    type="text"
                                    value={emergencyInfo.email}
                                    onChange={(e) => setEmergencyInfo({ ...emergencyInfo, email: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{emergencyInfo.email || '-'}</p>
                        )}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="rel-phone" className="text-[14px] font-medium text-(--gray-darker)">
                            Phone Number
                        </label>
                        {isEditingEmergency ? (
                            <div className="w-60">
                                <InputField
                                    className="h-9! text-end!"
                                    id="rel-phone"
                                    type="text"
                                    value={emergencyInfo.phone}
                                    onChange={(e) => setEmergencyInfo({ ...emergencyInfo, phone: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{emergencyInfo.phone || '-'}</p>
                        )}
                    </div>
                    {isEditingEmergency && (
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="submit" size="xs">Save Changes</Button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}

export default EmployeePersonalInformation