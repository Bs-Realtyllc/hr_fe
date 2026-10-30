'use client';

import Button from "@/components/Button/Button";
import ConfettiAnimation from "@/components/ConfettiAnimation";
import InputField from "@/components/InputField/InputField";
import { api } from "@/lib/api";
import { BSRealtyDropdown } from "@bsrealtyllc/design-system";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormErrors = {
    name?: string;
    email?: string;
    gender?: string;
    general?: string;
};

export default function RequestAccessPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role] = useState('admin');
    const [gender, setGender] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const router = useRouter();

    const validate = (): FormErrors => {
        const newErrors: FormErrors = {};
        const trimmedEmail = email.trim().toLocaleLowerCase();

        if (!name.trim()) {
            newErrors.name = "Name is required.";
        }

        if (!trimmedEmail) {
            newErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            newErrors.email = "Enter a valid email address.";
        }

        if (!gender) {
            newErrors.gender = "Please select your gender.";
        }

        return newErrors;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validationErrors = validate();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        const payload = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            gender,
            role,
        };

        setLoading(true);
        try {
            await api.post("/onboard/request-access", payload);
            // console.log("Req Access payload:", payload);

            setIsSubmitted(true);
            setErrors({});
        } catch (error: any) {
            const status = error?.response?.status;
            const serverMessage: string | undefined = error?.response?.data?.message;

            if (!error?.response) {
                setErrors({ general: "Can't reach the server. Check your connection and try again." });
            } else if (status === 409) {
                setErrors({ email: serverMessage || "This email has already requested access or is registered." });
            } else if (status === 400) {
                if (serverMessage?.toLowerCase().includes("mail")) {
                    setErrors({ email: serverMessage });
                } else {
                    setErrors({ general: serverMessage || "Please check your details and try again." });
                }
            } else if (status === 429) {
                setErrors({ general: "Too many attempts. Please wait a moment and try again." });
            } else {
                setErrors({ general: "Something went wrong. Please try again later." });
            }
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-(--soft-white-light) px-4 py-20">
            <div className='absolute top-[30px] left-[80px] '>
                <img width={'111px'} height={'20px'} src="/logos/gitgi-hr-logo.svg" alt="" />
            </div>

            {isSubmitted ? (
                // Success View
                <div className="flex flex-col w-[501px] items-center justify-center gap-4 text-center px-6 py-7">
                    <ConfettiAnimation />
                    <img src="/icons/Request-sent.svg" alt="Success" height={'63px'} width={'66px'} />
                    <p className="text-[18px] font-medium leading-7 text-(--neutral-normal)">
                        Your access request has been sent to the HR administrator. You will receive an email once your access is approved.
                    </p>
                    <Button variant="primary" size="small" onClick={() => { router.push('/') }}>Go Back to Login</Button>
                </div>
            ) : (
                <div className='max-w-[581px] flex flex-col gap-6 px-6 py-7 justify-center items-center'>
                    <div className='flex flex-col gap-3 items-center'>
                        <h1 className='text-[24px] font-medium text-(--neutral-normal)'>Request Access</h1>
                        <p className='text-(--gray-dark-active) font-normal text-[16px] text-center'>
                            This portal is restricted to authorized Company team members only. Submit your request and HR or Admin will review your access.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className='w-full flex flex-col items-center gap-6'>
                        <div className="w-full flex flex-col gap-3">
                            <div>
                                <InputField
                                    placeholder="Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                {errors.name && <p className="text-(--error-normal) text-sm mt-1">{errors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <div>
                                    <InputField
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                                        }}
                                    />

                                    {errors.email && <p className="text-(--error-normal) text-sm mt-1">{errors.email}</p>}
                                </div>
                                <p className="text-[14px] text-(--blue-dark-dark-hover)">Please use your @company.com email.</p>
                            </div>

                            <div>
                                <BSRealtyDropdown
                                    className="w-full!"
                                    placeholder="Select your Gender"
                                    value={gender}
                                    onChange={(value) => setGender(value)}
                                    options={[
                                        { label: 'Male', value: 'male' },
                                        { label: 'Female', value: 'female' },
                                        { label: 'other', value: 'other' },
                                    ]}
                                />
                                {errors.gender && <p className="text-(--error-normal) text-sm mt-1">{errors.gender}</p>}
                            </div>

                            <InputField disabled value={role} />
                        </div>

                        {errors.general && (
                            <p className="w-full text-center text-(--error-normal) text-sm">{errors.general}</p>
                        )}

                        <Button type="submit" variant="primary" className="w-full" size="medium" disabled={loading}>
                            {loading ? "Sending..." : "Request Access"}
                        </Button>



                    </form>
                </div>
            )}
        </div>
    );
}