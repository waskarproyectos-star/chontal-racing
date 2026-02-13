import { useState } from 'react';
import { MdArrowBackIos, MdArrowForwardIos, MdClose } from 'react-icons/md';

export default function ImageCarousel({ images, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) return null;

    const nextSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    return (
        <div className="carousel-container" onClick={(e) => e.stopPropagation()}>
            <div className="carousel-wrapper">
                {images.length > 1 && (
                    <button className="carousel-btn prev" onClick={prevSlide}>
                        <MdArrowBackIos />
                    </button>
                )}
                
                <div className="carousel-slide">
                    <img src={images[currentIndex]} alt={`Slide ${currentIndex + 1}`} />
                </div>

                {images.length > 1 && (
                    <button className="carousel-btn next" onClick={nextSlide}>
                        <MdArrowForwardIos />
                    </button>
                )}

                {onClose && (
                    <button className="carousel-close" onClick={onClose}>
                        <MdClose />
                    </button>
                )}
            </div>
            
            {images.length > 1 && (
                <div className="carousel-dots">
                    {images.map((_, idx) => (
                        <span 
                            key={idx} 
                            className={`dot ${currentIndex === idx ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                        ></span>
                    ))}
                </div>
            )}
        </div>
    );
}
