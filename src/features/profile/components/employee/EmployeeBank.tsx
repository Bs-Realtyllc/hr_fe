'use client'

import Button from "@/components/ui/Button/Button"
import InputField from "@/components/ui/InputField/InputField"
import { useEffect, useState } from "react"
import { profileService } from "@/features/profile/api/profileService"
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

    // Save handler
    const handleSaveBank = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await profileService.updateProfile({
                account_holder_name: bankInfo.accountHolder,
                account_number: bankInfo.accountNumber,
                branch_name: bankInfo.branchName,
                account_type: bankInfo.accountType,
                bank_name: bankInfo.bankName,
                bank_branch_name: bankInfo.branchName
                
            } as any);
            console.log("Updated Bank Info:", bankInfo);
            setIsEditingBank(false);
        } catch (err: any) {
            alert(err.message || "Failed to update bank details");
        }
    }

    if (loading) return <div className="p-4 text-gray-500">Loading bank details...</div>;
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
        <div className="flex flex-col gap-4 mb-20">
            {/* Bank Details */}
            <div className="flex flex-col gap-4 p-3">
                <div className="flex justify-between">
                    <div className="flex gap-2">
                        <div className="flex justify-center items-center bg-(--blue-sky-light) rounded-full h-7 w-7 text-(--blue-salt)">
                            {renderMaskIcon('/icons/building-bank.svg', '20px')}
                        </div>
                        <h1 className="text-[16px] font-semibold text-(--gray-darker)">Bank Details</h1>
                    </div>
                    <div>
                        <Button
                            className="text-(--blue-dark-normal)!"
                            variant="text"
                            size="small"
                            onClick={() => setIsEditingBank(!isEditingBank)}
                            leftIcon={renderMaskIcon('/icons/edit-4.svg', '20px')}
                        >
                            {isEditingBank ? "Cancel" : "Edit"}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSaveBank}>
                    {/* Account Holder Name */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
                        <label htmlFor="acc-holder" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Holder Name
                        </label>
                        {isEditingBank ? (
                            <div className="w-60 max-sm:w-full">
                                <InputField
                                    className="h-9! text-end!"
                                    id="acc-holder"
                                    type="text"
                                    value={bankInfo.accountHolder}
                                    onChange={(e) => setBankInfo({ ...bankInfo, accountHolder: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{bankInfo.accountHolder || '-'}</p>
                        )}
                    </div>

                    {/* Account Number */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
                        <label htmlFor="acc-num" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Number
                        </label>
                        {isEditingBank ? (
                            <div className="w-60 max-sm:w-full">
                                <InputField
                                    className="h-9! text-end!"
                                    id="acc-num"
                                    type="text"
                                    value={bankInfo.accountNumber}
                                    onChange={(e) => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{bankInfo.accountNumber || '-'}</p>
                        )}
                    </div>

                    {/* Bank Name */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
                        <label htmlFor="branch" className="text-[14px] font-medium text-(--gray-darker)">
                            Bank Name
                        </label>
                        {isEditingBank ? (
                            <div className="w-60 max-sm:w-full">
                                <InputField
                                    className="h-9! text-end!"
                                    id="bank"
                                    type="text"
                                    value={bankInfo.bankName}
                                    onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{bankInfo.bankName || '-'}</p>
                        )}
                    </div>

                    {/* Branch Name */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
                        <label htmlFor="branch" className="text-[14px] font-medium text-(--gray-darker)">
                            Branch Name
                        </label>
                        {isEditingBank ? (
                            <div className="w-60 max-sm:w-full">
                                <InputField
                                    className="h-9! text-end!"
                                    id="branch"
                                    type="text"
                                    value={bankInfo.branchName}
                                    onChange={(e) => setBankInfo({ ...bankInfo, branchName: e.target.value })}
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] font-medium text-(--white-darker)">{bankInfo.branchName || '-'}</p>
                        )}
                    </div>

                    {/* Account Type */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 gap-[6px] sm:items-center sm:gap-[16px] max-sm:flex-col">
                        <label htmlFor="acc-type" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Type
                        </label>
                        {isEditingBank ? (
                            <div className="w-60 max-sm:w-full pb-1">
                                <BSRealtyDropdown
                                    className="w-60! max-sm:w-full! text-end!"
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

                    {isEditingBank && (
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="submit" size="xs">Save Changes</Button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}

export default EmployeeBank