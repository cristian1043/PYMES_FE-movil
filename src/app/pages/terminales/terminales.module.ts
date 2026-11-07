import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { TerminalesPageRoutingModule } from './terminales-routing.module';
import { TerminalesPage } from './terminales.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TerminalesPageRoutingModule
  ],
  declarations: [TerminalesPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TerminalesPageModule {}
