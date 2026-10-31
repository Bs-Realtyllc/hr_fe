import Button from "@/components/Button/Button";
import Link from "next/link";

export default function ErrorPage() {
    return (
        <div className="fixed inset-0 flex justify-center items-center z-9999">
            <div className="flex flex-col gap-4 items-center">
                <img src="/images/error-page-img.svg" alt="" width={150} height={150} />

                <div className="space-y-4">
                    <div className="text-center">
                        <h1 className="text-[24px] font-medium text-(--neutral-normal)">
                            Something went Wrong
                        </h1>
                        <p className="text-[18px] font-normal text-(--gray-dark)">
                            We’re having trouble loading this page. Please try again in a moment.                        </p>
                    </div>

                    <div className="flex justify-center gap-2">
                        <Link href="/">
                            <Button size="small">Go Home</Button>
                        </Link>
                        <a href="mailto:support@yourdomain.com">
                            <Button className="outline text-(--blue-sky-hover)!" variant="text" size="small">
                                Contact Support
                            </Button>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}