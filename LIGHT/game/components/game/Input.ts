export class InputHandler {
    keys: Record<string, boolean> = {};
    mouseX: number = 0;
    mouseY: number = 0;
    isMouseDown: boolean = false;

    // Virtual Input (Touch)
    virtualMove = { x: 0, y: 0 };
    virtualAim = { x: 0, y: 0 };
    virtualAimActive = false;
    virtualDash = false;

    constructor() {
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        // Prevent context menu on touch devices
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

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

    handleMouseDown = () => {
        this.isMouseDown = true;
    };

    handleMouseUp = () => {
        this.isMouseDown = false;
    };

    cleanup() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
    }
}