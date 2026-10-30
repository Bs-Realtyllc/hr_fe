import Button from '@/components/Button/Button'
import React from 'react'

const EmployeeEmployment = () => {
    return (
        <div className="flex flex-col gap-4">

            {/* Employment detail */}
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
                        <h1 className="text-[16px] font-semibold text-[#232931]">Employment Details</h1>
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
                        <label htmlFor="emp-id" className="text-[14px] font-medium text-[#232931]">
                            Employment ID
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">A21B</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="job-title" className="text-[14px] font-medium text-[#232931]">
                            Job Title
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Design</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="department" className="text-[14px] font-medium text-[#232931]">
                            Department
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">IT</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="start-date" className="text-[14px] font-medium text-[#232931]">
                            Start Date
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Sep 15, 20026</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="emp-type" className="text-[14px] font-medium text-[#232931]">
                            Employee Type
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Full-Time</p>
                        {/* <InputField className="" /> */}
                    </div>
                </form>
            </div>

            {/* Organization & Reporting */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center  bg-[#EBF5FB] rounded-full h-7 w-7 text-[#4A6FA5]"><span style={{
                            display: 'inline-block',
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'currentColor',
                            maskImage: 'url(/icons/building-office-2.svg)',
                            maskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            WebkitMaskImage: 'url(/icons/building-office-2.svg)',
                            WebkitMaskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat'
                        }}
                        /></div>
                        <h1 className="text-[16px] font-semibold text-[#232931]">Organization & Reporting</h1>
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
                        <label htmlFor="reporting-managet" className="text-[14px] font-medium text-[#232931]">
                            Reporting Manager
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">-</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-[#E8E9EA] justify-between py-3">
                        <label htmlFor="work-location" className="text-[14px] font-medium text-[#232931]">
                            Work Location <span className='text-[#64748B]'>(optional)</span>
                        </label>
                        <p className="text-[14px] font-medium text-[#595959]">Remote</p>
                        {/* <InputField className="" /> */}
                    </div>


                </form>
            </div>


        </div>
    )
}

export default EmployeeEmployment
