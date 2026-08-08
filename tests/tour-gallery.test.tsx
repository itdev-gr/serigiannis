import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TourGallery } from '@/components/trips/TourGallery';
import type { GalleryImage } from '@/lib/gallery';

// jsdom implements <dialog> without showModal/close, and has no scrollIntoView at all.
// showModal/close also flip the `open` attribute, matching real <dialog> behaviour,
// so the component's own `dlg.open` checks (and tests asserting close() fired) work.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
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

  it('με τρεις φωτογραφίες δείχνει και τις τρεις σε mosaic, χωρίς κουμπί', () => {
    render(<TourGallery images={photos(3)} />);
    expect(screen.getAllByTestId('gallery-cell')).toHaveLength(3);
    expect(screen.queryByTestId('gallery-see-all')).not.toBeInTheDocument();
  });

  it('με τέσσερις φωτογραφίες δείχνει και τις τέσσερις, χωρίς κουμπί', () => {
    render(<TourGallery images={photos(4)} />);
    expect(screen.getAllByTestId('gallery-cell')).toHaveLength(4);
    expect(screen.queryByTestId('gallery-see-all')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('lightbox-photo')).toHaveLength(4);
  });

  it('με έξι φωτογραφίες δείχνει πέντε και κουμπί που δεν είναι μέσα σε κελί', () => {
    render(<TourGallery images={photos(6)} />);
    expect(screen.getAllByTestId('gallery-cell')).toHaveLength(5);
    const btn = screen.getByTestId('gallery-see-all');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.closest('[data-testid="gallery-cell"]')).toBeNull();
    expect(screen.getByText('Δείτε και τις 6')).toBeInTheDocument();
  });

  it('still lists all three photos in the lightbox', () => {
    render(<TourGallery images={photos(3)} />);
    expect(screen.getAllByTestId('lightbox-photo')).toHaveLength(3);
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

  it('highlights the dot matching the active slide, and moves it on next', () => {
    render(<TourGallery images={photos(3)} />);
    let dots = screen.getAllByTestId('carousel-dot');
    expect(dots[0]).toHaveClass('opacity-100');
    expect(dots[1]).toHaveClass('opacity-50');
    expect(dots[2]).toHaveClass('opacity-50');

    fireEvent.click(screen.getByRole('button', { name: 'Επόμενη φωτογραφία' }));

    dots = screen.getAllByTestId('carousel-dot');
    expect(dots[0]).toHaveClass('opacity-50');
    expect(dots[1]).toHaveClass('opacity-100');
    expect(dots[2]).toHaveClass('opacity-50');
  });

  // Accepted upstream limitation, ruled on by the client: dots are capped at eight
  // and rendered from images.slice(0, 8), so once the active slide advances past
  // the eighth photo no dot matches it and none is highlighted. This test pins
  // that behaviour so any future change to it is deliberate rather than accidental.
  it('leaves no dot active once the carousel advances past the eight-dot cap', () => {
    render(<TourGallery images={photos(12)} />);
    const next = screen.getByRole('button', { name: 'Επόμενη φωτογραφία' });
    for (let i = 0; i < 8; i++) fireEvent.click(next);

    const dots = screen.getAllByTestId('carousel-dot');
    for (const dot of dots) expect(dot).not.toHaveClass('opacity-100');
  });

  it('opens the lightbox when a grid cell is clicked', () => {
    render(<TourGallery images={photos(7)} />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByTestId('gallery-cell')[2]);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
  });

  it('opens the same lightbox when a mobile carousel slide is clicked', () => {
    render(<TourGallery images={photos(7)} />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByTestId('carousel-slide')[3]);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
  });

  it('closes the lightbox when the empty area around the photos is clicked', () => {
    render(<TourGallery images={photos(3)} />);
    fireEvent.click(screen.getAllByTestId('gallery-cell')[0]);
    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('lightbox-scroll'));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
  });

  it('does not close the lightbox when a photo inside it is clicked', () => {
    render(<TourGallery images={photos(3)} />);
    fireEvent.click(screen.getAllByTestId('gallery-cell')[0]);
    fireEvent.click(screen.getAllByTestId('lightbox-photo')[0]);
    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
  });
});
