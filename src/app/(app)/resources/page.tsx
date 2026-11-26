'use client';
import PageHeader from '@/components/layout/PageHeader';
import PolicyDocuments from '@/features/policies/components/PolicyDocuments';
import MaskIcon from '@/components/ui/MaskIcon';
import { useAuth } from '@/contexts/AuthContext';


export default function ResourcesPage() {
  const { user } = useAuth();
  console.log(user?.role)

  return (
    <div className='h-screen  w-full flex flex-col'>
      <div className="w-full ">

        <PageHeader title={
          user?.role === 'admin' ? ('Resources') : ('Company Resources')
        } discription={user?.role === 'admin' ? ('Manage company policies, handbooks, guides, and shared work resources for your employees.') : ("Access company policies, employee handbooks, guides, and shared work resources in one place.")} />

      </div>

      {/* Announce card */}
      <div className=' flex rounded-lg p-3 gap-2 bg-(--soft-white-light)'>
        {user?.role === 'admin' ? (
          <div className='h-7 w-7 bg-(--info-light) rounded-lg flex justify-center items-center'>
            <MaskIcon src='/icons/file-01.svg' size={20} color='var(--info-normal)' />
          </div>
        ) : (
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
        )}

        <div className='flex flex-col gap-0.5'>
          <h1 className='text-[14px] font-semibold text-(--gray-darker)'>
            {
              user?.role === 'admin' ? ('Build your company resources Library') : ('Stay updated with company policies')
            }

          </h1>
          <p className='text-[12px] font-medium text-(--gray-dark)'>
            {
              user?.role === 'admin' ? ('Upload important documents such as policies, handbooks other company resources for your team. ') : ('Review the latest workplace guidelines and policies to stay informed about company procedures.')
            }
          </p>
        </div>
      </div>


      <div className='flex flex-1 h-full w-full '>
        <PolicyDocuments
          category="policy"
          heading="Documents & Signature"
          adminSubtitle="Publish policies, handbooks, and other documents for the team to review and sign."
          employeeSubtitle="Download, review, and sign the documents below."

        />
      </div>
    </div >

  );
}
