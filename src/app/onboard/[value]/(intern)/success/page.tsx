'use client';

import ConfettiAnimation from "@/components/ConfettiAnimation";

const SuccessPage = () => {
    return (
        <div>
            <ConfettiAnimation />
            <div className=" flex w-screen h-screen justify-center items-center p-4 lg:px-15 pt-22 lg:pb-8">
                <div className=' absolute top-7.5 left-4 lg:left-15  '>
                    <img className='h-4 w-22 lg:h-5 lg:w-28' src="/logos/gitgi-hr-logo.svg" alt="" />
                </div >

                <div className="flex flex-col items-center justify-center w-full lg:w-[464px] gap-4 p-5 lg:p-6">
                    <img src="/icons/success-icon.svg" alt="success" height={'64px'} width={'64px'} />
                    <div className="text-center flex-col gap-2 lg:gap-0">

                        <h1 className="text-[24px] lg:text-[28px] font-semibold text-(--neutral-normal)">Document Submitted!</h1>
                        <p className="text-[16px] lg:text-[18px] text-(--gray-dark)">Your document has been submitted successfully.</p></div>
                </div>

            </div>
        </div>
    );
};

export default SuccessPage;