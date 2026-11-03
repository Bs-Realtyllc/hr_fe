'use client';

import ConfettiAnimation from "@/components/ConfettiAnimation";

const SuccessPage = () => {
    return (
        <div>
            <ConfettiAnimation />
            <div className=" flex w-screen h-screen justify-center items-center px-15 pt-22 pb-8">
                <div className="absolute top-9 left-15">
                    <img width={111} height={20} src="/logos/gitgi-hr-logo.svg" alt="Gitgi HR" />
                </div>

                <div className=" flex flex-col items-center justify-center w-[464px] gap-4 p-6">
                    <img src="/icons/success-icon.svg" alt="success" height={'64px'} width={'64px'} />
                    <div className="text-center">

                        <h1 className="text-[28px] font-semibold text-[#17212B]">Document Submitted</h1>
                        <p className="text-[18px] text-[#4B5768]">Your document has been submitted successfully.</p></div>
                </div>

            </div>
        </div>
    );
};

export default SuccessPage;