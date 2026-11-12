'use client';
import PageHeader from '@/components/PageHeader';
import PolicyDocuments from '@/components/PolicyDocuments';


export default function ResourcesPage() {

  return (
    // <div className='h-full w-full flex flex-col'>
    //   <div className="w-full  ">

    //     <PageHeader title={'Company Resources'} discription={"Access company policies, employee handbooks, guides, and shared work resources in one place."} />

    //   </div>

    //   <div className='  m-6 flex-1 flex min-h-0 flex-col gap-6  '>
    //     <div className=' flex rounded-lg p-3 gap-2 bg-[#fefefe]'>
    //       {/* {isAdmin ? 'Published documents' : 'Available documents'} */}

    //       <div className='h-7 w-7 bg-[#E8F6ED] rounded-lg flex justify-center items-center'>
    //         <span
    //           className="inline-block h-5 w-5 bg-[#16A34A]"
    //           style={{
    //             WebkitMaskImage: 'url(/icons/announcement-01.svg)',
    //             maskImage: 'url(/icons/announcement-01.svg)',
    //             WebkitMaskRepeat: 'no-repeat',
    //             maskRepeat: 'no-repeat',
    //             WebkitMaskPosition: 'center',
    //             maskPosition: 'center',
    //             WebkitMaskSize: 'contain',
    //             maskSize: 'contain',
    //           }}
    //         />
    //       </div>

    //       <div className='flex flex-col gap-0.5'>
    //         <h1 className='text-[14px] font-semibold text-[#232931]'>Stay updated with company policies</h1>
    //         <p className='text-[12px] font-medium text-[#4B5768]'>Review the latest workplace guidelines and policies to stay informed about company procedures.</p>
    //       </div>

    //     </div>

    //     {
    //       isEmpety === false ? (
    //         <div>
    //           <div className="search-bar mb-4">
    //             <span
    //               className="icon-mask search-bar-icon"
    //               style={{ WebkitMaskImage: 'url(/icons/search.svg)', maskImage: 'url(/icons/search.svg)' }}
    //             />
    //             <input
    //               className="form-input"
    //               placeholder="Search by title..."


    //             />

    //           </div>

    //           <div className='flex flex-wrap gap-5 '>


    //           </div>
    //         </div>
    //       ) : (
    //         < div className=' flex flex-1 w-full justify-center items-center rounded-lg  bg-[#fefefe]'>
    //           <div className='flex flex-col justify-center items-center w-[574px] h-[253px]'>
    //             <img src="/images/documents-01.svg" alt="doc" height={'141px'} width={'160px'} />
    //             <div className='flex flex-col py-4 px-2 text-center gap-1'>
    //               <h1 className='text-[20px] text-[#111920] font-semibold'>No resources available yet</h1>
    //               <p className='text-[16px] text-[#505D6F] font-medium'>Company policies, handbooks, and helpful resources will appear here once they're added.</p>

    //             </div>
    //           </div>
    //         </div>
    //       )

    //     }


    //   </div >
    // </div >


    <div className='h-full w-full flex flex-col'>
      <div className="w-full  ">

        <PageHeader title={'Company Resources'} discription={"Access company policies, employee handbooks, guides, and shared work resources in one place."} />

      </div>

      {/* Announce card */}
      <div className=' flex rounded-lg p-3 gap-2 bg-(--soft-white-light)'>

        <div className='h-7 w-7 bg-(--success-light) rounded-lg flex justify-center items-center'>
          <span
            className="inline-block h-5 w-5 bg-(--success-normal)"
            style={{
              WebkitMaskImage: 'url(/icons/announcement-01.svg)',
              maskImage: 'url(/icons/announcement-01.svg)',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />
        </div>


        <div className='flex flex-col gap-0.5'>
          <h1 className='text-[14px] font-semibold text-(--gray-darker)'>Stay updated with company policies</h1>
          <p className='text-[12px] font-medium text-(--gray-dark)'>Review the latest workplace guidelines and policies to stay informed about company procedures.</p>
        </div>
      </div>


      <PolicyDocuments
        category="policy"
        heading="Documents & Signature"
        adminSubtitle="Publish policies, handbooks, and other documents for the team to review and sign."
        employeeSubtitle="Download, review, and sign the documents below."
        emptyMessage={
          < div className=' flex flex-1 w-full justify-center items-center rounded-lg  bg-(--soft-white-light)'>
            <div className='flex flex-col justify-center items-center w-[574px] h-[253px]'>
              <img src="/images/documents-01.svg" alt="doc" height={'141px'} width={'160px'} />
              <div className='flex flex-col py-4 px-2 text-center gap-1'>
                <h1 className='text-[20px] text-(--neutral-dark) font-semibold'>No resources available yet</h1>
                <p className='text-[16px] text-(--gray-normal-active) font-medium'>Company policies, handbooks, and helpful resources will appear here once they're added.</p>

              </div>
            </div>
          </div>}


      />
    </div>

  );
}
