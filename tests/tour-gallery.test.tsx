import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TourGallery } from '@/components/trips/TourGallery';
import type { GalleryImage } from '@/lib/gallery';

// jsdom implements <dialog> without showModal/close.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

const photos = (n: number): GalleryImage[] =>
  Array.from({ length: n }, (_, i) => ({ url: `https://cdn.example.com/${i}.jpg`, alt: `Φωτογραφία ${i + 1}` }));

describe('TourGallery', () => {
  it('renders nothing without photos', () => {
    const { container } = render(<TourGallery images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows five cells and the See-all pill for a 7-photo tour', () => {
    render(<TourGallery images={photos(7)} />);
    expect(screen.getAllByTestId('gallery-cell')).toHaveLength(5);
    expect(screen.getByText('Δείτε και τις 7')).toBeInTheDocument();
  });

  it('shows every photo and no pill when there are three', () => {
    render(<TourGallery images={photos(3)} />);
    expect(screen.getAllByTestId('gallery-cell')).toHaveLength(3);
    expect(screen.queryByText(/Δείτε και τις/)).not.toBeInTheDocument();
  });

  it('lists every photo in the lightbox, including the ones not shown inline', () => {
    render(<TourGallery images={photos(7)} />);
    expect(screen.getAllByTestId('lightbox-photo')).toHaveLength(7);
  });

  it('renders a mobile carousel slide per photo, with dots capped at eight', () => {
    render(<TourGallery images={photos(12)} />);
    expect(screen.getByTestId('gallery-carousel')).toBeInTheDocument();
    expect(screen.getAllByTestId('carousel-slide')).toHaveLength(12);
    expect(screen.getAllByTestId('carousel-dot')).toHaveLength(8);
  });

  it('advances the carousel when the next button is clicked', async () => {
    render(<TourGallery images={photos(3)} />);
    const track = screen.getByTestId('carousel-track');
    expect(track).toHaveStyle({ transform: 'translateX(-0%)' });
    fireEvent.click(screen.getByRole('button', { name: 'Επόμενη φωτογραφία' }));
    expect(track).toHaveStyle({ transform: 'translateX(-100%)' });
  });

  it('hides the arrows for a single photo', () => {
    render(<TourGallery images={photos(1)} />);
    expect(screen.queryByRole('button', { name: 'Επόμενη φωτογραφία' })).not.toBeInTheDocument();
  });
});
