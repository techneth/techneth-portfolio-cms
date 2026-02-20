export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-black/60">
            <div className="flex flex-col items-center">
                <div className="relative h-16 w-16">
                    {/* Animated Spinner Rings */}
                    <div className="absolute inset-0 border-4 border-[#00A99D]/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-[#00A99D] rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-sm font-medium text-[#00A99D] animate-pulse">
                    Loading...
                </p>
            </div>
        </div>
    );
}
