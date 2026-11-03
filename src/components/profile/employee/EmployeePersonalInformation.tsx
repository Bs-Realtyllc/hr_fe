'use client'

import Button from "@/components/Button/Button"
import InputField from "@/components/InputField/InputField"

const EmployeePersonalInformation = () => {
    return (
        <div className="flex flex-col gap-4">

            {/* Personal detail */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center  bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)"><span style={{
                            display: 'inline-block',
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'currentColor',
                            maskImage: 'url(/icons/user.svg)',
                            maskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            WebkitMaskImage: 'url(/icons/user.svg)',
                            WebkitMaskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat'
                        }}
                        /></div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Personal Detail</h1>
                    </div>
                    <div>
                        <Button className="text-(--blue-dark-normal)!" variant="text" size="small" leftIcon={
                            <span style={{
                                display: 'inline-block',
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'currentColor',
                                maskImage: 'url(/icons/edit-4.svg)',
                                maskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                WebkitMaskImage: 'url(/icons/edit-4.svg)',
                                WebkitMaskSize: 'contain',
                                WebkitMaskRepeat: 'no-repeat'
                            }}

                            />}>Edit</Button>
                    </div>
                </div>

                <form className="">
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="name" className="text-[14px] font-medium text-(--gray-darker)">
                            Full Name
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Olivia Rodriya</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="dob" className="text-[14px] font-medium text-(--gray-darker)">
                            Date of Birth
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Sep 15, 2007</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="gender" className="text-[14px] font-medium text-(--gray-darker)">
                            Gender
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Female</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="nationality" className="text-[14px] font-medium text-(--gray-darker)">
                            Nationality
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Nepali</p>
                        {/* <InputField className="" /> */}
                    </div>
                </form>
            </div>

            {/* Contact Information */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center  bg-(--blue-sky-light) rounded-full h-7 w-7 text-[#4A6FA5]"><span style={{
                            display: 'inline-block',
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'currentColor',
                            maskImage: 'url(/icons/mail.svg)',
                            maskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            WebkitMaskImage: 'url(/icons/mail.svg)',
                            WebkitMaskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat'
                        }}
                        /></div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Contact Information</h1>
                    </div>
                    <div>
                        <Button className="text-(--blue-dark-normal)!" variant="text" size="small"
                            leftIcon={
                                <span style={{
                                    display: 'inline-block',
                                    width: '20px',
                                    height: '20px',
                                    backgroundColor: 'currentColor',
                                    maskImage: 'url(/icons/edit-4.svg)',
                                    maskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskImage: 'url(/icons/edit-4.svg)',
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat'
                                }}

                                />}
                        >
                            Edit</Button>
                    </div>
                </div>

                <form className="">
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="comp-email" className="text-[14px] font-medium text-(--gray-darker)">
                            Company email
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">olivia@company.com</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="dob" className="text-[14px] font-medium text-(--gray-darker)">
                            Personal email
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Oliviarodriya@gmail.com</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="phone" className="text-[14px] font-medium text-(--gray-darker)">
                            Phone Number
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">+9779812345678</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="current-add" className="text-[14px] font-medium text-(--gray-darker)">
                            Current Address
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Kathmandu</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="permanent-add" className="text-[14px] font-medium text-(--gray-darker)">
                            Permanent Address
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Kailali</p>
                        {/* <InputField className="" /> */}
                    </div>
                </form>
            </div>

            {/* Emergency Contact */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center  bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)"><span style={{
                            display: 'inline-block',
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'currentColor',
                            maskImage: 'url(/icons/phone.svg)',
                            maskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            WebkitMaskImage: 'url(/icons/phone.svg)',
                            WebkitMaskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat'
                        }}
                        /></div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Emergency Contact</h1>
                    </div>
                    <div>
                        <Button className="text-(--blue-dark-normal)!" variant="text" size="small" leftIcon={
                            <span style={{
                                display: 'inline-block',
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'currentColor',
                                maskImage: 'url(/icons/edit-4.svg)',
                                maskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                WebkitMaskImage: 'url(/icons/edit-4.svg)',
                                WebkitMaskSize: 'contain',
                                WebkitMaskRepeat: 'no-repeat'
                            }}

                            />}>Edit</Button>
                    </div>
                </div>

                <form className="">
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="rel-name" className="text-[14px] font-medium text-(--gray-darker)">
                            Full Name
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">John Smith</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="relationship" className="text-[14px] font-medium text-(--gray-darker)">
                            Relationship
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Father</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="rel-email" className="text-[14px] font-medium text-(--gray-darker)">
                            Email
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">johnsmi@gmail.com</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="rel-phone" className="text-[14px] font-medium text-(--gray-darker)">
                            Phone Number
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">+977 98********</p>
                        {/* <InputField className="" /> */}
                    </div>
                </form>
            </div>
        </div >
    )
}

export default EmployeePersonalInformation
