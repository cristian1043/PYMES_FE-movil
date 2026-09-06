import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { SeleccionarEmpresaPageRoutingModule } from './seleccionar-empresa-routing.module';
import { SeleccionarEmpresaPage } from './seleccionar-empresa.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SeleccionarEmpresaPageRoutingModule
  ],
  declarations: [SeleccionarEmpresaPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SeleccionarEmpresaPageModule {}
