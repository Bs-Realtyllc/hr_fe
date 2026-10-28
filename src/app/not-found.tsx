import Button from "@/components/Button/Button";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="fixed w-full h-full inset-0 flex justify-center items-center z-9999">
            <div className="flex flex-col gap-4 items-center">
                <img src="/images/error-page-img.svg" alt="" width={150} height={150} />

                <div className="space-y-4">
                    <div className="text-center">
                        <h1 className="text-[24px] font-medium text-(--neutral-normal)">
                            Page not found
                        </h1>
                        <p className="text-[18px] font-normal text-(--gray-dark)">
                            The page you’re looking for doesn’t exist or has been moved.
                        </p>
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