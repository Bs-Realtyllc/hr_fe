'use client';

import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import { Weight } from "lucide-react";
import { useState } from "react";
import { Label } from "recharts";

export default function RequestAccessPage() {
    const [department, setDepartment] = useState('')
    const [role, setRole] = useState('')

    return (
        <div className='relative w-full flex   min-h-screen bg-[#fefefe] flex justify-center items-center'>
            <div className='absolute top-[30px] left-[80px] '>
                <img width={'111px'} height={'20px'} src="/logos/gitgi-hr-logo.svg" alt="" />
            </div >
            <div className=' max-w-[581px] flex flex-col gap-6 px-6 py-7  justify-center items-center '>

                <div className=' flex flex-col gap-3 items-center  '>
                    <h1 className='text-[24px] font-medium text-[#17212B]'>Request Access</h1>
                    <p className='text-[#2D343F] font-normal text-[16px] text-center'>
                        This portal is restricted to authorized Company team members only. Submit your request and HR  or Admin will review your access.
                    </p>
                </div>
                <div className=' w-full flex flex-col items-center gap-6'>
                    <div className="w-full flex flex-col gap-3">
                        <InputField placeholder="Name" />
                        <div className="space-y-1">
                            <InputField placeholder="Email" />
                            <p className="text-[14px] text-[#153859]">Please use your @company.com email.</p>
                        </div>

                        <BSRealtyDropdown className="w-full!" placeholder="Enter your Department"
                            value={department}
                            onChange={(value) => setDepartment(value)}
                            options={[
                                {
                                    'label': 'Admin',
                                    'value': 'admin',
                                },
                                {
                                    'label': 'Design',
                                    'value': 'design',
                                },
                                {
                                    'label': 'Engineering',
                                    'value': 'engineering',
                                },
                                {
                                    'label': 'Finance',
                                    'value': 'finance',
                                },
                                {
                                    'label': 'HR',
                                    'value': 'hr',
                                },
                                {
                                    'label': 'IT',
                                    'value': 'IT',
                                },
                                {
                                    'label': 'Marketing & Sales',
                                    'value': 'marketing-sales',
                                }


                            ]} />
                        <BSRealtyDropdown className="w-full!" placeholder="Enter your Role"
                            value={role}
                            onChange={(value) => setRole(value)}
                            options={[
                                {
                                    label: 'Admin',
                                    value: 'admin'
                                },
                                {
                                    label: 'Backend Developer',
                                    value: 'backend_dev'
                                },
                                {
                                    label: 'Frontend Developer',
                                    value: 'frontend_dev'
                                },
                                {
                                    label: 'Fullstack Developer',
                                    value: 'fullstack_dev'
                                },
                                {
                                    label: 'HR',
                                    value: 'hr'
                                },
                                {
                                    label: 'Product Designer',
                                    value: 'product_designer'
                                },
                                {
                                    label: 'UI/UX Designer',
                                    value: 'ui_ux_designer'
                                },
                                {
                                    label: 'Quality Assurance',
                                    value: 'quality_assurance'
                                },
                                {
                                    label: 'Team Lead',
                                    value: 'team_lead'
                                },

                            ]} />
                    </div>

                    <Button variant="primary" className="w-full" size="medium" >Sign In</Button>

                </div>
            </div>
        </div >


    );
}