'use client'

import Button from "@/components/Button/Button"
import InputField from "@/components/InputField/InputField"
import { useEffect, useState } from "react"
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
    })
    const [isEditingBank, setIsEditingBank] = useState(false)

    // Fetch profile and bank data on mount
    useEffect(() => {
        async function loadBankData() {
            try {
                setLoading(true);
                const data = await profileService.getProfile();
                console.log("Fetched Profile Data for Bank:", data);

                setBankInfo({
                    accountHolder: (data as any).account_holder || (data as any).acc_holder || '',
                    accountNumber: (data as any).account_number || (data as any).acc_num || '',
                    branchName: (data as any).branch_name || (data as any).branch || '',
                    accountType: (data as any).account_type || (data as any).acc_type || '',
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
                account_holder: bankInfo.accountHolder,
                account_number: bankInfo.accountNumber,
                branch_name: bankInfo.branchName,
                account_type: bankInfo.accountType,
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
        <div className="flex flex-col gap-4">
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
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="acc-holder" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Holder Name
                        </label>
                        {isEditingBank ? (
                            <div className="w-60">
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
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="acc-num" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Number
                        </label>
                        {isEditingBank ? (
                            <div className="w-60">
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

                    {/* Branch Name */}
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="branch" className="text-[14px] font-medium text-(--gray-darker)">
                            Branch Name
                        </label>
                        {isEditingBank ? (
                            <div className="w-60">
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
                    <div className="flex border-b border-(--neutral-light) justify-between py-3 items-center">
                        <label htmlFor="acc-type" className="text-[14px] font-medium text-(--gray-darker)">
                            Account Type
                        </label>
                        {isEditingBank ? (
                            <div className="w-60 pb-1">
                                <BSRealtyDropdown
                                    className="w-60! text-end!"
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