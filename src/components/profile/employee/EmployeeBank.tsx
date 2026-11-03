import Button from '@/components/Button/Button'
import React from 'react'

const EmployeeBank = () => {
    return (
        <div className="flex flex-col gap-4">



            {/* Bank Details */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between ">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center  bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)"><span style={{
                            display: 'inline-block',
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'currentColor',
                            maskImage: 'url(/icons/building-bank.svg)',
                            maskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            WebkitMaskImage: 'url(/icons/building-bank.svg)',
                            WebkitMaskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat'
                        }}
                        /></div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Bank Details</h1>
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
                        <label htmlFor="acc-holder" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Holder Name
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Olivia Rhye</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="acc-num" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Number
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">012***********54</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="branch" className="text-[14px] font-medium text-(--gray-darker)">
                            Branch Name
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Kathmandu</p>
                        {/* <InputField className="" /> */}
                    </div>
                    <div className="flex border-b border-(--neutral-light) justify-between py-3">
                        <label htmlFor="acc-type" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Type
                        </label>
                        <p className="text-[14px] font-medium text-(--white-darker)">Saving</p>
                        {/* <InputField className="" /> */}
                    </div>


                </form>
            </div>


        </div>
    )
}

export default EmployeeBank
