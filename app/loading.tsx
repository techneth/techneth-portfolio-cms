import Image from 'next/image';
import logo from '@/public/techneth.svg';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md dark:bg-black/80">
            <div className="flex flex-col items-center">
                <div className="relative h-24 w-auto animate-[pulse_3s_ease-in-out_infinite] flex items-center justify-center">
                    <Image
                        src={logo}
                        alt="Techneth Logo"
                        width={200}
                        height={60}
                        className="h-20 w-auto filter drop-shadow-[0_0_15px_rgba(0,169,157,0.4)]"
                        priority
                    />
                </div>
                <div className="mt-8 flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-[#00A99D] rounded-full animate-[bounce_1.5s_infinite] [animation-delay:-0.4s]"></div>
                        <div className="w-1.5 h-1.5 bg-[#00A99D] rounded-full animate-[bounce_1.5s_infinite] [animation-delay:-0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-[#00A99D] rounded-full animate-[bounce_1.5s_infinite]"></div>
                    </div>
                    <span className="text-sm font-semibold text-[#00A99D] tracking-wider uppercase">
                        Loading
                    </span>
                </div>
            </div>
        </div>
    );
}

