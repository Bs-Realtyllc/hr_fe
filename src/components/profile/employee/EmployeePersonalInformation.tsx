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
                        <div className="flex justify-center items-center  bg-[#EBF5FB] rounded-full h-7 w-7 text-[#4A6FA5]"><span style={{
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
                        <h1 className="text-[16px] font-semibold text-[#232931]">Personal Detail</h1>
                    </div>
                    <div>
                        <Button className="text-[#235E94]!" variant="text" size="small" leftIcon={
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
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="name" className="text-[14px] font-medium text-[#232931]">
                            Full Name
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Olivia Rodriya</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="dob" className="text-[14px] font-medium text-[#232931]">
                            Date of Birth
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Sep 15, 2007</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="gender" className="text-[14px] font-medium text-[#232931]">
                            Gender
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Female</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="nationality" className="text-[14px] font-medium text-[#232931]">
                            Nationality
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Nepali</p>
                        {/* <InputField className="" /> */}
                    </div>
                </form>
            </div>

            {/* Contact Information */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center  bg-[#EBF5FB] rounded-full h-7 w-7 text-[#4A6FA5]"><span style={{
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
                        <h1 className="text-[16px] font-semibold text-[#232931]">Contact Information</h1>
                    </div>
                    <div>
                        <Button className="text-[#235E94]!" variant="text" size="small"
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
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="comp-email" className="text-[14px] font-medium text-[#232931]">
                            Company email
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">olivia@company.com</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="dob" className="text-[14px] font-medium text-[#232931]">
                            Personal email
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Oliviarodriya@gmail.com</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="phone" className="text-[14px] font-medium text-[#232931]">
                            Phone Number
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">+9779812345678</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="current-add" className="text-[14px] font-medium text-[#232931]">
                            Current Address
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Kathmandu</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="permanent-add" className="text-[14px] font-medium text-[#232931]">
                            Permanent Address
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Kailali</p>
                        {/* <InputField className="" /> */}
                    </div>
                </form>
            </div>

            {/* Emergency Contact */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center  bg-[#EBF5FB] rounded-full h-7 w-7 text-[#4A6FA5]"><span style={{
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
                        <h1 className="text-[16px] font-semibold text-[#232931]">Emergency Contact</h1>
                    </div>
                    <div>
                        <Button className="text-[#235E94]!" variant="text" size="small" leftIcon={
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
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="rel-name" className="text-[14px] font-medium text-[#232931]">
                            Full Name
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">John Smith</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="relationship" className="text-[14px] font-medium text-[#232931]">
                            Relationship
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Father</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="rel-email" className="text-[14px] font-medium text-[#232931]">
                            Email
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">johnsmi@gmail.com</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="rel-phone" className="text-[14px] font-medium text-[#232931]">
                            Phone Number
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">+977 98********</p>
                        {/* <InputField className="" /> */}
                    </div>
                </form>
            </div>
        </div >
    )
}

export default EmployeePersonalInformation
