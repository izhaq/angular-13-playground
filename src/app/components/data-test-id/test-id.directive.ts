 import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTestId]'
})
export class TestIdDirective {
  @Input('appTestId') testId: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    if (this.testId) {
      this.renderer.setAttribute(
        this.el.nativeElement,
        'data-test-id',
        this.testId
      );
    }
  }
}
