'use client'

import Button from "@/components/Button/Button"
import PageHeader from "@/components/PageHeader"
import MaskIcon from "@/components/ui/MaskIcon"
import { BSRealtyCalender } from "@bsrealtyllc/design-system"
import DatePicker from "react-datepicker"

const page = () => {
    return (
        <div>
            {/* Page Header */}
            <div>
                <PageHeader title={'Calendar '} discription={"View and manage your schedule, meetings, company events, and important dates in one place."} />
            </div>

            {/* Main container*/}
            <div className="w-full w-full pb-6 gap-5">

                <div className="w-full max-h-[898px]">
                    {/* calander top buttons */}
                    <div className="">
                        <div className=" bg-(--soft-white-light) rounded-lg p-3 gap-2 flex justify-end border">
                            <div className=" w-full">
                                <BSRealtyCalender
                                    onChange={() => { }}
                                    value="2026-09-15"
                                    variant="singleMonthSelector"
                                />
                            </div>
                            <Button size="medium" leftIcon={
                                <MaskIcon src='/icons/plus.svg' size={18} />
                            }>Schedule Meeting</Button>
                        </div>

                    </div>

                    <div className="">
                        <div className="grid grid-cols-7 ">
                            <div>Sunday</div>
                            <div>Sunday</div>
                            <div>Sunday</div>
                            <div>Sunday</div>
                            <div>Sunday</div>
                            <div>Sunday</div>
                            <div>Sunday</div>
                        </div>
                    </div>
                </div>

                {/* Holidays & events */}
                <div>

                </div>

            </div>

        </div>
    )
}

export default page
