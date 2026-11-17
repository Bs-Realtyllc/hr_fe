import Button from "@/components/Button/Button";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="fixed  top-0 right-0 left-[260px]   h-full flex justify-center items-center">
            <div className="flex flex-col gap-4 items-center">
                <img src="/images/error.png" alt="Error" width={150} height={150} />

                <div className="space-y-4">
                    <div className="text-center">
                        <h1 className="text-[24px] font-medium text-(--neutral-normal)">
                            404 Page not found
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