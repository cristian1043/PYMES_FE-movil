import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService (Pruebas Unitarias)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('1. Debe inicializar el servicio correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('2. Debe retornar false en isLoggedIn() cuando no hay sesión iniciada', () => {
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getToken()).toBeNull();
  });

  it('3. Debe guardar el token y actualizar el usuario tras un login exitoso', () => {
    const mockResponse = {
      exito: true,
      mensaje: 'Inicio de sesión exitoso',
      access_token: 'fake-jwt-token-12345',
      usuario: { id: 1, username: 'admin', email: 'admin@pymesoft.com', id_rol: 1 }
    };

    service.login({ username: 'admin', password: 'password123' }).subscribe(res => {
      expect(res.exito).toBeTrue();
      expect(service.getToken()).toBe('fake-jwt-token-12345');
      expect(service.isLoggedIn()).toBeTrue();
      expect(service.getUsuario().username).toBe('admin');
    });

    const req = httpMock.expectOne(`${service['apiUrl']}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('4. Debe limpiar el almacenamiento y cerrar la sesión con logout()', () => {
    sessionStorage.setItem('access_token', 'token-test');
    sessionStorage.setItem('usuario', JSON.stringify({ id: 1, username: 'admin' }));

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getUsuario()).toBeNull();
    expect(service.getEmpresaActiva()).toBeNull();
  });

  it('5. Debe asignar y actualizar la empresa activa correctamente', () => {
    const mockEmpresa = { id: 10, nombre: 'Empresa Test SAS', nit: '900123456-1' };
    service.setEmpresaActiva(mockEmpresa, 1);

    const activa = service.getEmpresaActiva();
    expect(activa).toBeTruthy();
    expect(activa.id).toBe(10);
    expect(activa.rol_nombre).toBe('Administrador');
    expect(service.getRolId()).toBe(1);
  });
});
