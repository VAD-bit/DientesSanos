import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Play } from "lucide-react";

export default function HorizontalScrollGallery({ items, children }) {
    const trackRef = useRef(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [selectedMedia, setSelectedMedia] = useState(null);

    // Track scroll progress to drive parallax effects
    const handleScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        const { scrollLeft, scrollWidth, clientWidth } = track;
        const maxScroll = scrollWidth - clientWidth;
        if (maxScroll <= 0) return;
        setScrollProgress(scrollLeft / maxScroll);
    };

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        track.addEventListener("scroll", handleScroll);
        window.addEventListener("resize", handleScroll);
        return () => {
            if (track) track.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
        };
    }, []);

    // Drag to scroll logic
    const handleMouseDown = (e) => {
        const track = trackRef.current;
        if (!track) return;
        setIsDragging(true);
        setStartX(e.pageX - track.offsetLeft);
        setScrollLeft(track.scrollLeft);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const track = trackRef.current;
        if (!track) return;
        const x = e.pageX - track.offsetLeft;
        const walk = (x - startX) * 1.6; // Scroll speed multiplier
        track.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    const navigate = (direction) => {
        const track = trackRef.current;
        if (!track) return;
        const scrollAmount = direction === "left" ? -450 : 450;
        track.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    return (
        <div className="w-full relative py-4 select-none overflow-hidden">
            {/* Ambient Background Aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#111111]/5 rounded-full blur-[160px] pointer-events-none -z-10" />

            {/* Header Content */}
            {children && <div className="mb-6 text-center">{children}</div>}

            {/* Luxury Draggable Runway Track */}
            <div className="relative w-full overflow-visible">
                <div
                    ref={trackRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    className="showcase-track flex gap-6 overflow-x-auto pb-8 pt-2 scrollbar-none cursor-grab active:cursor-grabbing px-4 sm:px-8 md:px-12 scroll-smooth"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    {items.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        const isThird = idx % 3 === 0;
                        let cardStyle = {};
                        if (item.type === "video") {
                            // Enforce a perfect vertical 9:16 aspect ratio, scaled down to 420px height to fit viewports
                            cardStyle = { height: "420px", width: "236px" };
                        } else {
                            // Alternate card layouts for images only for an editorial staggered look (scaled down)
                            if (isThird) {
                                cardStyle = { height: "360px", width: "240px", transform: "translateY(-10px)" };
                            } else if (isEven) {
                                cardStyle = { height: "400px", width: "270px" };
                            } else {
                                cardStyle = { height: "330px", width: "240px", transform: "translateY(15px)" };
                            }
                        }

                        // Calculate unique parallax shift per card based on scroll progress
                        // Safe shift range that always stays within the scale-115 scale buffer
                        const shift = (scrollProgress - 0.5) * -36;

                        return (
                            <div
                                key={idx}
                                onClick={() => setSelectedMedia(item)}
                                className="runway-card flex-shrink-0 relative rounded-[2rem] overflow-hidden border border-[#e8d4b0]/15 bg-[#0a0a0c] transition-all duration-700 hover:border-[#e8d4b0]/40 hover:shadow-[0_25px_60px_rgba(17, 17, 17,0.12)] group"
                                style={{ ...cardStyle }}
                            >
                                {/* Inner Parallax Media Wrapper with scale-115 buffer */}
                                <div className="absolute inset-0 w-full h-full scale-115 overflow-hidden">
                                    <div 
                                        className="w-full h-full transition-transform duration-100 ease-out"
                                        style={{ transform: `translateX(${shift}px)` }}
                                    >
                                        <div
                                            className="w-full h-full object-cover brightness-[0.7] group-hover:brightness-[0.88] transition-all duration-700"
                                            style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}
                                            aria-hidden="true"
                                        />
                                    </div>
                                </div>

                                {/* Play icon indicator for videos - placed at card root level to avoid parallax clipping */}
                                {item.type === "video" && (
                                    <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-[#e8d4b0]/20 flex items-center justify-center text-[#e8d4b0] z-20">
                                        <Play size={14} fill="#e8d4b0" />
                                    </div>
                                )}

                                {/* Luxury Double Border Overlay */}
                                <div className="absolute inset-4 rounded-[1.5rem] border border-[#d9c08f]/15 pointer-events-none group-hover:border-[#e8d4b0]/20 transition-colors duration-500" />

                                {/* High-End Shadow Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />

                                {/* Floating Editorial Typography */}
                                <div className="absolute inset-0 p-8 flex flex-col justify-between z-20 pointer-events-none">
                                    {/* Top large luxury index */}
                                    <div className="text-[120px] font-serif font-extralight text-[#e8d4b0]/10 line-height-none tracking-tighter select-none transition-colors duration-500 group-hover:text-[#e8d4b0]/20">
                                        0{idx + 1}
                                    </div>

                                    {/* Bottom labels */}
                                    <div className="flex items-end justify-between w-full">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-[#e8d4b0] tracking-[0.3em] block uppercase">
                                                {item.category === "videos" ? "Cine" : "Lookbook"}
                                            </span>
                                            <h4 className="text-xl font-bold text-white uppercase tracking-wider font-sans group-hover:text-[#e8d4b0] transition-colors duration-300">
                                                {item.label}
                                            </h4>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 opacity-0 group-hover:opacity-100 group-hover:border-[#e8d4b0]/30 group-hover:text-[#e8d4b0] transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                            <Maximize2 size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Editorial Runway Navigation Controls */}
            <div className="flex items-center justify-between w-full max-w-sm mx-auto mt-4 px-6 z-30 relative">
                <button
                    onClick={() => navigate("left")}
                    className="w-12 h-12 rounded-full border border-[#d9c08f]/30 text-[#111111] bg-white backdrop-blur-md flex items-center justify-center hover:bg-[#e8d4b0] hover:text-[#111111] hover:border-[#e8d4b0] transition-all duration-300 cursor-pointer"
                >
                    <ChevronLeft size={20} />
                </button>

                {/* Fine Progress Bar Indicator */}
                <div className="flex-1 mx-8 h-[2px] bg-[#d9c08f]/15 rounded-full overflow-hidden relative">
                    <div 
                        className="absolute left-0 top-0 h-full bg-[#111111] rounded-full transition-all duration-300"
                        style={{ width: `${scrollProgress * 100}%` }}
                    />
                </div>

                <button
                    onClick={() => navigate("right")}
                    className="w-12 h-12 rounded-full border border-[#d9c08f]/30 text-[#111111] bg-white backdrop-blur-md flex items-center justify-center hover:bg-[#e8d4b0] hover:text-[#111111] hover:border-[#e8d4b0] transition-all duration-300 cursor-pointer"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Lightbox Lightroom Modal */}
            {selectedMedia && (
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl transition-all duration-500"
                    onClick={() => setSelectedMedia(null)}
                >
                    <div className="absolute top-6 right-6 text-white/40 hover:text-white text-4xl font-light cursor-pointer select-none">
                        &times;
                    </div>
                    <div 
                        className="relative max-w-4xl w-full max-h-[80vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center bg-black"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="w-full h-auto max-h-[80vh] object-contain"
                            style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)', minHeight: '50vh' }}
                            aria-hidden="true"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/75 to-transparent text-left">
                            <span className="text-[10px] font-bold text-[#e8d4b0] tracking-[0.3em] block mb-1">MURAL DIENTES SANOS</span>
                            <h3 className="text-2xl font-bold text-white uppercase tracking-wider">{selectedMedia.label}</h3>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* Hide scrolls but keep drag active */
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-none {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
