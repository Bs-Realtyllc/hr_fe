'use client'

import Button from "@/components/Button/Button"
import InputField from "@/components/InputField/InputField"
import { useEffect, useRef, useState } from "react"
import { profileService } from "@/lib/profileService"
import { BSRealtyDropdown } from "@bsrealtyllc/design-system"

const EmployeeBank = () => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Bank Details State & Toggle
    const [bankInfo, setBankInfo] = useState({
        accountHolder: '',
        accountNumber: '',
        branchName: '',
        accountType: '',
        bankName: '',
    })
    const [isEditingBank, setIsEditingBank] = useState(false)

    // Fetch profile and bank data on mount
    useEffect(() => {
        async function loadBankData() {
            try {
                setLoading(true);
                const data = await profileService.getProfile();

                setBankInfo({
                    accountHolder: (data as any).account_holder_name,
                    accountNumber: (data as any).account_number,
                    branchName: (data as any).bank_branch_name,
                    accountType: (data as any).account_type || (data as any).acc_type || '',
                    bankName: (data as any).bank_name,
                });
            } catch (err: any) {
                setError(err.message || "Failed to load bank details");
            } finally {
                setLoading(false);
            }
        }
        loadBankData();
    }, []);

    // focus first input field when click edit btn
    const accountHolderRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isEditingBank) {
            accountHolderRef.current?.focus();
        }
    }, [isEditingBank]);

    // Save handler
    const handleSaveBank = async () => {
        try {
            await profileService.updateProfile({
                account_holder_name: bankInfo.accountHolder,
                account_number: bankInfo.accountNumber,
                branch_name: bankInfo.branchName,
                bank_branch_name: bankInfo.branchName,
                account_type: bankInfo.accountType,
                bank_name: bankInfo.bankName,
            } as any);

            setIsEditingBank(false);
        } catch (err: any) {
            alert(err.message || "Failed to update bank details");
        }
    };

    if (loading) return <div className="p-4 text-(--gray-normal)">Loading bank details...</div>;
    if (error) return <div className="p-4 text-(--error-normal)">Error: {error}</div>;

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

    const formatAccountNumber = (accNum?: string | number | null): string => {
        const value = String(accNum ?? "").trim();
        if (!value) return "-";

        // Too short to have middle characters to mask
        if (value.length <= 5) {
            return value;
        }

        const firstThree = value.slice(0, 3);
        const lastTwo = value.slice(-2);
        const middleCount = value.length - 5; // total length minus first 3 and last 2

        return `${firstThree}${"*".repeat(middleCount)}${lastTwo}`;
    };

    return (
        <div className="flex flex-col gap-4 mb-20">
            {/* Bank Details */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
                            {renderMaskIcon('/icons/building-bank.svg', '20px')}
                        </div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">
                            Bank Details
                        </h1>
                    </div>

                    {isEditingBank ? (
                        <div className="flex gap-2">
                            {/* <Button
                                type="button"
                                className="text-(--blue-dark-normal)!"
                                variant="text"
                                size="xs"
                                onClick={() => setIsEditingBank(false)}
                            >
                                Cancel
                            </Button> */}

                            <Button
                                type="button"
                                size="xs"
                                onClick={handleSaveBank}
                            >
                                Save Changes
                            </Button>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            className="text-(--blue-dark-normal)!"
                            variant="text"
                            size="xs"
                            onClick={() => setIsEditingBank(true)}
                            leftIcon={renderMaskIcon('/icons/edit-4.svg')}
                        >
                            Edit
                        </Button>
                    )}
                </div>

                <div>
                    {/* Account Holder Name */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="acc-holder" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Holder Name
                        </label>
                        <div>
                            <input ref={accountHolderRef} className="outline-none w-90 ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                                id="acc-holder"
                                type="text"
                                value={bankInfo.accountHolder}
                                onChange={(e) => setBankInfo({ ...bankInfo, accountHolder: e.target.value })}
                                disabled={!isEditingBank} />
                        </div>

                    </div>

                    {/* Account Number */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="acc-num" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Number
                        </label>
                        <div>
                            <input className="outline-none w-90 ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                                id="acc-num"
                                type="text"
                                value={
                                    isEditingBank
                                        ? (bankInfo?.accountNumber ?? "")
                                        : formatAccountNumber(bankInfo?.accountNumber)
                                }
                                onChange={(e) =>
                                    setBankInfo((prev) => ({
                                        ...prev,
                                        accountNumber: e.target.value,
                                    }))
                                }
                                disabled={!isEditingBank}
                            />
                        </div>
                    </div>

                    {/* Bank Name */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="branch" className="text-[14px] font-medium text-(--gray-darker)">
                            Bank Name
                        </label>
                        <div>
                            <input className="outline-none w-90 ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                                id="bank"
                                type="text"
                                value={bankInfo.bankName}
                                onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                                disabled={!isEditingBank} />
                        </div>

                    </div>

                    {/* Branch Name */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="branch" className="text-[14px] font-medium text-(--gray-darker)">
                            Branch Name
                        </label>
                        <div>
                            <input className="outline-none w-90 ring-0 focus:border-0 focus:outline-none focus:ring-0 active:border-0 hover:border-0 text-end text-[14px] font-medium text-(--white-darker) mr-0"
                                id="branch"
                                type="text"
                                value={bankInfo.branchName}
                                onChange={(e) => setBankInfo({ ...bankInfo, branchName: e.target.value })}
                                disabled={!isEditingBank} />
                        </div>
                    </div>

                    {/* Account Type */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="acc-type" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Type
                        </label>
                        {isEditingBank ? (
                            <div >
                                <BSRealtyDropdown
                                    className="w-50! [&_.bsr-dropdown\_input-wrapper]:h-9! [&_.bsr-dropdown\_input]:h-full!"
                                    value={bankInfo.accountType}
                                    onChange={(val: string) => setBankInfo({ ...bankInfo, accountType: val })}
                                    options={[
                                        { label: 'Saving', value: 'saving' },
                                        { label: 'Current', value: 'current' },
                                        { label: 'Salary', value: 'salary' }
                                    ]}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker) capitalize">{bankInfo.accountType || '-'}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EmployeeBank