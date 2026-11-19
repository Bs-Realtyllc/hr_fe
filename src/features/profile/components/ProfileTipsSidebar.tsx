import Button from '@/components/ui/Button/Button';

/** Static tips column shown beside the employee tabs. */
export default function ProfileTipsSidebar() {
  return (
    <div className='w-[285px] shrink-0 flex flex-col gap-5'>
      <div className='p-4 flex flex-col gap-3 bg-(--success-light-hover)  rounded-lg'>
        <h1 className='text-[12px] font-semibold text-(--success-normal)'>PROFILE & SECURITY</h1>
        <div className='flex flex-col gap-1'>
          <h1 className='text-[16px] font-semibold text-(--gray-darker)'>Keep your profile up to date</h1>
          <p className='text-[14px] text-(--gray-dark-hover) font-medium'>Review your personal details and emergency contact informationto keep your employee record accurate</p>
        </div>
      </div>

      <div className='p-4 flex flex-col gap-3 bg-(--info-light-hover) rounded-lg'>
        <h1 className='text-[12px] font-semibold text-(--info-normal)'>PROFILE & SECURITY</h1>
        <div className='flex flex-col gap-1'>
          <h1 className='text-[16px] font-semibold text-(--gray-darker)'>Keep your profile up to date</h1>
          <p className='text-[14px] text-(--gray-dark-hover) font-medium'>Review your personal details and emergency contact informationto keep your employee record accurate</p>
        </div>
        <Button size='small'>Explore Resources</Button>
      </div>
    </div>
  );
}
