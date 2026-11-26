export default function FlashMessage({ msg, msgType }: { msg: string; msgType: 'ok' | 'err' }) {
  return (
    <>
      {/* Flash message */}
      {msg && (
        <div
          role="status"
          className="fixed right-6 top-6 z-300 rounded-lg px-4 py-3 text-[14px] font-medium shadow-md"
          style={msgType === 'ok'
            ? { background: '#DCF1E4', color: '#16A34A' }
            : { background: '#FDE8E8', color: '#DC2626' }}
        >
          {msg}
        </div>
      )}
    </>
  );
}
