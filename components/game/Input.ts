export class InputHandler {
    keys: Record<string, boolean> = {};
    mouseX: number = 0;
    mouseY: number = 0;
    isMouseDown: boolean = false;
    isRightMouseDown: boolean = false;

    // Virtual Input (Touch)
    virtualMove = { x: 0, y: 0 };
    virtualAim = { x: 0, y: 0 };
    virtualAimActive = false;
    virtualDash = false;
    virtualShoot = false; // Add virtualShoot for touch screen shooting

    constructor() {
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        // Block browser gestures: context menu, double-tap zoom, pinch zoom
        window.addEventListener('contextmenu', this.handlePreventDefault);
        window.addEventListener('dblclick', this.handlePreventDefault);
        window.addEventListener('gesturestart', this.handlePreventDefault as EventListener);
    }

    handlePreventDefault = (e: Event) => {
        e.preventDefault();
    };

    handleKeyDown = (e: KeyboardEvent) => {
        this.keys[e.code] = true;
    };

    handleKeyUp = (e: KeyboardEvent) => {
        this.keys[e.code] = false;
    };

    handleMouseMove = (e: MouseEvent) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        // If mouse moves, we assume virtual aim is inactive to allow switching
        this.virtualAimActive = false;
    };

    handleMouseDown = (e: MouseEvent) => {
        // Click-to-focus for itch.io iframe so keyboard input works at once
        try {
            if (typeof window !== 'undefined' && document.hasFocus && !document.hasFocus()) {
                window.focus();
            }
        } catch (err) {}
        if (e.button === 0) this.isMouseDown = true;
        if (e.button === 2) this.isRightMouseDown = true;
    };

    handleMouseUp = (e: MouseEvent) => {
        if (e.button === 0) this.isMouseDown = false;
        if (e.button === 2) this.isRightMouseDown = false;
    };

    cleanup() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('contextmenu', this.handlePreventDefault);
        window.removeEventListener('dblclick', this.handlePreventDefault);
        window.removeEventListener('gesturestart', this.handlePreventDefault as EventListener);
    }
}