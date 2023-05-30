import SignaturePad from '../src/signature_pad';
import { face } from './fixtures/face';
import { square } from './fixtures/square';
import './utils/pointer-event-polyfill';

let canvas: HTMLCanvasElement;
const dpr = window.devicePixelRatio;

function changeDevicePixelRatio(ratio: number) {
  window.devicePixelRatio = ratio;
  canvas.setAttribute('width', (canvas.width * ratio).toString());
  canvas.setAttribute('height', (canvas.height * ratio).toString());
}

type ImageConstructor = new (
  width?: number | undefined,
  height?: number | undefined,
) => HTMLImageElement;

function mockImage() {
  const imgs: MockImage[] = [];

  class MockImage extends ImageBitmap {
    onload: () => void;
    onerror: (error: unknown) => void;

    constructor() {
      super();
      this.onload = jest.fn();
      this.onerror = jest.fn();
      imgs.push(this);
    }
  }

  global.Image = MockImage as unknown as ImageConstructor;

  return imgs;
}

beforeEach(() => {
  window.devicePixelRatio = dpr;
  canvas = document.createElement('canvas');
  canvas.setAttribute('width', '300');
  canvas.setAttribute('height', '150');
});

describe('#constructor', () => {
  it('returns an instance of SignaturePad', () => {
    const pad = new SignaturePad(canvas);

    expect(pad).toBeInstanceOf(SignaturePad);
  });

  it("allows to set 'throttle' to 0", () => {
    const pad = new SignaturePad(canvas, { throttle: 0 });

    expect(pad.throttle).toBe(0);
  });

  it("allows to set 'minDistance' to 0", () => {
    const pad = new SignaturePad(canvas, { minDistance: 0 });

    expect(pad.minDistance).toBe(0);
  });
});

describe('#clear', () => {
  // it.skip('clears canvas', () => {});

  it('clears data structures', () => {
    const pad = new SignaturePad(canvas);

    pad.fromData(face);
    expect(pad.isEmpty()).toBe(false);

    pad.clear();

    expect(pad.isEmpty()).toBe(true);
    expect(pad.toData()).toEqual([]);
  });
});

describe('#isEmpty', () => {
  it('returns true if pad is empty', () => {
    const pad = new SignaturePad(canvas);

    expect(pad.isEmpty()).toBe(true);
  });

  it('returns false if pad is not empty', () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    expect(pad.isEmpty()).toBe(false);
  });
});

describe('#fromData', () => {
  it('clears the canvas', () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);
    pad.fromData(square);

    expect(pad.toDataURL('image/svg+xml')).toMatchSnapshot();
  });

  it('does not clear the canvas', () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);
    pad.fromData(square, { clear: false });

    expect(pad.toDataURL('image/svg+xml')).toMatchSnapshot();
  });

  it('uses point group options to calculate line', () => {
    const pad = new SignaturePad(canvas, {
      penColor: 'black',
      dotSize: 1,
      minWidth: 0.5,
      maxWidth: 2.5,
      velocityFilterWeight: 0.7,
    });
    pad.fromData(face);
    const expected = pad.toDataURL('image/svg+xml');

    pad.clear();
    pad.penColor = 'white';
    pad.dotSize = 2;
    pad.minWidth = 5;
    pad.maxWidth = 10;
    pad.velocityFilterWeight = 0.9;

    pad.fromData(face);
    expect(pad.toDataURL('image/svg+xml')).toBe(expected);
  });
});

describe('#toData', () => {
  it('returns JSON with point groups', () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    expect(pad.toData()).toEqual(face);
  });
});

describe('#fromDataURL', () => {
  it('image.onload', async () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    const images = mockImage();
    const fromDataUrlPromise = pad.fromDataURL(pad.toDataURL());

    expect(images).toHaveLength(1);

    images[0].onload();

    await expect(fromDataUrlPromise).resolves.toBeUndefined();
  });

  it('image.onerror', async () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    const images = mockImage();
    const fromDataUrlPromise = pad.fromDataURL(pad.toDataURL());

    expect(images).toHaveLength(1);

    images[0].onerror('error');

    await expect(fromDataUrlPromise).rejects.toBe('error');
  });
});

describe('#toDataURL', () => {
  it('returns PNG image by default', () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    expect(pad.toDataURL()).toEqual(expect.stringMatching('data:image/png'));
  });

  it('returns PNG image in data URL format', () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    // Unfortunately, results of Canvas#toDataURL depend on a platform :/
    expect(pad.toDataURL('image/png')).toEqual(
      expect.stringMatching('data:image/png'),
    );
  });

  // Synchronous Canvas#toDataURL for JPEG images is not supported by 'canvas' library :/
  // it.skip('returns JPG image in data URL format', () => {});

  it('returns SVG image in data URL format', () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    expect(pad.toDataURL('image/svg+xml')).toMatchSnapshot();
  });

  it('returns SVG image in data URL format with high DPI', () => {
    changeDevicePixelRatio(2);
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    expect(pad.toDataURL('image/svg+xml')).toMatchSnapshot();
  });

  it('returns SVG image with backgroundColor', () => {
    const pad = new SignaturePad(canvas, { backgroundColor: '#fcc' });
    pad.fromData(face);

    expect(
      pad.toDataURL('image/svg+xml', { includeBackgroundColor: true }),
    ).toMatchSnapshot();
  });

  it('typescript error when not SVG with SVGoptions', () => {
    const pad = new SignaturePad(canvas, { backgroundColor: '#fcc' });
    pad.fromData(face);

    expect(
      // @ts-expect-error No ToSVGOptions unless it is an SVG
      pad.toDataURL('image/png', { includeBackgroundColor: true }),
    ).toEqual(expect.stringMatching('data:image/png'));
  });
});

describe('#toSVG', () => {
  it('returns SVG image', () => {
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    expect(pad.toSVG()).toMatchSnapshot();
  });

  it('returns SVG image with high DPI', () => {
    changeDevicePixelRatio(2);
    const pad = new SignaturePad(canvas);
    pad.fromData(face);

    expect(pad.toSVG()).toMatchSnapshot();
  });

  it('returns SVG image with backgroundColor', () => {
    const pad = new SignaturePad(canvas, { backgroundColor: '#fcc' });
    pad.fromData(face);

    expect(pad.toSVG({ includeBackgroundColor: true })).toMatchSnapshot();
  });
});

describe('user interactions', () => {
  it('allows user to paint on the pad', () => {
    const pad = new SignaturePad(canvas);
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 30,
        pressure: 1,
        buttons: 1,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 240,
        clientY: 30,
        pressure: 1,
        buttons: 1,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 150,
        clientY: 120,
        pressure: 1,
        buttons: 1,
      }),
    );
    expect(pad.toDataURL('image/svg+xml')).toMatchSnapshot();
  });

  it('call endStroke on pointerup outside canvas', () => {
    const pad = new SignaturePad(canvas);
    const endStroke = jest.fn();
    pad.addEventListener('endStroke', endStroke);
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 30,
        pressure: 1,
        buttons: 1,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 240,
        clientY: 30,
        pressure: 1,
        buttons: 1,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 150,
        clientY: 120,
        pressure: 1,
        buttons: 1,
      }),
    );
    expect(endStroke).toHaveBeenCalled();
  });

  it('call endStroke on pointerup outside canvas when in an external window', () => {
    const externalCanvas = document.createElement('canvas');
    externalCanvas.setAttribute('width', '300');
    externalCanvas.setAttribute('height', '150');

    const externalDocument =
      document.implementation.createHTMLDocument('New Document');

    externalDocument.body.appendChild(externalCanvas);

    const pad = new SignaturePad(externalCanvas);
    const endStroke = jest.fn();
    pad.addEventListener('endStroke', endStroke);

    externalCanvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 30,
        pressure: 1,
        buttons: 1,
      }),
    );
    externalCanvas.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 240,
        clientY: 30,
        pressure: 1,
        buttons: 1,
      }),
    );
    // check that original document is not affected
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 150,
        clientY: 120,
        pressure: 1,
        buttons: 1,
      }),
    );
    expect(endStroke).not.toHaveBeenCalled();
    // check that external document emits
    externalDocument.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 150,
        clientY: 120,
        pressure: 1,
        buttons: 1,
      }),
    );
    expect(endStroke).toHaveBeenCalled();
  });
});

describe(`touch events.`, () => {
  let signpad: SignaturePad;

  function createTouchEvents(cancelable: boolean) {
    const touchStartEvent = new TouchEvent('touchstart', {
      cancelable,
      targetTouches: [
        {
          clientX: 50,
          clientY: 30,
          force: 1,
        } as Touch,
      ],
      changedTouches: [
        {
          clientX: 50,
          clientY: 30,
          force: 1,
        } as Touch,
      ],
    });
    const touchMoveEvent = new TouchEvent('touchmove', {
      cancelable,
      targetTouches: [
        {
          clientX: 55,
          clientY: 35,
          force: 1,
        } as Touch,
      ],
    });
    const touchEndEvent = new TouchEvent('touchend', {
      cancelable,
      changedTouches: [
        {
          clientX: 55,
          clientY: 35,
          force: 1,
        } as Touch,
      ],
    });
    jest.spyOn(touchStartEvent, 'preventDefault');
    jest.spyOn(touchMoveEvent, 'preventDefault');
    jest.spyOn(touchEndEvent, 'preventDefault');

    return {
      touchStartEvent,
      touchMoveEvent,
      touchEndEvent,
    };
  }

  beforeEach(() => {
    signpad = new SignaturePad(canvas);
    signpad.off();
    signpad['_handleTouchEvents']();
  });

  it('the event should not be prevented.', () => {
    const { touchStartEvent, touchMoveEvent, touchEndEvent } =
      createTouchEvents(false);
    canvas.dispatchEvent(touchStartEvent);
    canvas.dispatchEvent(touchMoveEvent);
    canvas.dispatchEvent(touchEndEvent);

    expect(touchStartEvent.preventDefault).not.toHaveBeenCalled();
    expect(touchMoveEvent.preventDefault).not.toHaveBeenCalled();
    expect(touchEndEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('the event should be prevented.', () => {
    const { touchStartEvent, touchMoveEvent, touchEndEvent } =
      createTouchEvents(true);
    canvas.dispatchEvent(touchStartEvent);
    canvas.dispatchEvent(touchMoveEvent);
    canvas.dispatchEvent(touchEndEvent);

    expect(touchStartEvent.preventDefault).toHaveBeenCalled();
    expect(touchMoveEvent.preventDefault).toHaveBeenCalled();
    expect(touchEndEvent.preventDefault).toHaveBeenCalled();
  });
});

describe(`mouse events.`, () => {
  let signpad: SignaturePad;

  function createMouseEvents(cancelable: boolean) {
    const mouseDownEvent = new MouseEvent('mousedown', {
      cancelable,
      clientX: 50,
      clientY: 30,
      buttons: 1,
    });
    const mouseMoveEvent = new MouseEvent('mousemove', {
      cancelable,
      clientX: 55,
      clientY: 35,
      buttons: 1,
    });
    const mouseUpEvent = new MouseEvent('mouseup', {
      cancelable,
      clientX: 55,
      clientY: 35,
      buttons: 1,
    });
    jest.spyOn(mouseDownEvent, 'preventDefault');
    jest.spyOn(mouseMoveEvent, 'preventDefault');
    jest.spyOn(mouseUpEvent, 'preventDefault');

    return {
      mouseDownEvent,
      mouseMoveEvent,
      mouseUpEvent,
    };
  }

  beforeEach(() => {
    signpad = new SignaturePad(canvas);
    signpad.off();
    signpad['_handleMouseEvents']();
  });

  it('the event should not be prevented.', () => {
    const { mouseDownEvent, mouseMoveEvent, mouseUpEvent } =
      createMouseEvents(true);
    canvas.dispatchEvent(mouseDownEvent);
    canvas.dispatchEvent(mouseMoveEvent);
    canvas.ownerDocument.dispatchEvent(mouseUpEvent);

    expect(mouseDownEvent.preventDefault).not.toHaveBeenCalled();
    expect(mouseMoveEvent.preventDefault).not.toHaveBeenCalled();
    expect(mouseUpEvent.preventDefault).not.toHaveBeenCalled();
  });
});

describe('Signature events.', () => {
  let signpad: SignaturePad;
  let eventDispatched: Event | undefined;

  const eventHandler: EventListener = (evt: Event): void => {
    eventDispatched = evt;
  };

  beforeEach(() => {
    signpad = new SignaturePad(canvas);

    // to make this test works, canvas must be added to the document body.
    document.body.insertAdjacentElement('afterbegin', canvas);

    eventDispatched = undefined;
  });

  afterEach(() => {
    document.body.removeChild(canvas);
  });

  [
    { eventName: 'beginStroke', dispatchedEventName: ['pointerdown'] },
    { eventName: 'beforeUpdateStroke', dispatchedEventName: ['pointerdown'] },
    { eventName: 'afterUpdateStroke', dispatchedEventName: ['pointerdown'] },
    {
      eventName: 'endStroke',
      dispatchedEventName: ['pointerdown', 'pointerup'],
    },
  ].forEach((param) => {
    describe(`${param.eventName}.`, () => {
      beforeEach(() => {
        signpad.addEventListener(param.eventName, eventHandler);
      });

      afterEach(() => {
        signpad.removeEventListener(param.eventName, eventHandler);
      });

      it('no writing to the canvas.', () => {
        expect(eventDispatched).toBeFalsy();
      });

      it('writes to the canvas.', () => {
        const eventInitObj = <PointerEventInit>{
          clientX: 50,
          clientY: 30,
          pressure: 1,
          buttons: 1,
          bubbles: true,
        };
        let pointerEvent;
        for (const dispatchedEventName of param.dispatchedEventName) {
          pointerEvent = new PointerEvent(dispatchedEventName, eventInitObj);
          canvas.dispatchEvent(pointerEvent);
        }

        expect(eventDispatched).toBeTruthy();
        expect(eventDispatched).toBeInstanceOf(CustomEvent);

        const event = <CustomEvent>eventDispatched;
        expect(event.detail).toBe(pointerEvent);
      });
    });
  });

  describe(`use document as EventTarget.`, () => {
    beforeEach(() => {
      signpad['_et'] = document;

      signpad.addEventListener('beginStroke', eventHandler);
    });

    afterEach(() => {
      signpad.removeEventListener('beginStroke', eventHandler);
    });

    it('the event should be dispatched.', () => {
      const eventInitObj = <PointerEventInit>{
        clientX: 50,
        clientY: 30,
        pressure: 1,
        buttons: 1,
      };
      const pointerEvent = new PointerEvent('pointerdown', eventInitObj);
      canvas.dispatchEvent(pointerEvent);

      expect(eventDispatched).toBeTruthy();
      expect(eventDispatched).toBeInstanceOf(CustomEvent);

      const event = <CustomEvent>eventDispatched;
      expect(event.detail).toBe(pointerEvent);
    });
  });
});
