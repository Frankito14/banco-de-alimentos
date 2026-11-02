import { Deposito, Comedor, Lote, Entrega, Usuario } from '../types';

export const MOCK_USUARIOS: Usuario[] = [
  {
    id: 'u-voluntario-1',
    nombre: 'Vol Untario (Voluntario)',
    email: 'voluntario@bancodealimentos.gob.ar',
    rol: 'Voluntario',
    depositoAsignadoId: 'dep-hurlingham'
  },
  {
    id: 'u-referente-1',
    nombre: 'Refe Rente (Referente)',
    email: 'referente@comedor-sol.gob.ar',
    rol: 'ReferenteComedor',
    comedorAsignadoId: 'com-el-sol'
  },
  {
    id: 'u-coordinador-1',
    nombre: 'Cor Dinador (Coordinador)',
    email: 'coordinador@ministerio.gob.ar',
    rol: 'Coordinador'
  }
];

export const MOCK_DEPOSITOS: Deposito[] = [
  {
    id: 'dep-hurlingham',
    nombre: 'Depósito Regional N° 1 - Hurlingham',
    direccion: 'Av. Vergara 2222',
    localidad: 'Hurlingham',
    capacidadTotal: 15000
  },
  {
    id: 'dep-moron',
    nombre: 'Depósito Regional N° 2 - Morón',
    direccion: 'Rivadavia 14200',
    localidad: 'Morón',
    capacidadTotal: 12000
  }
];

export const MOCK_COMEDORES: Comedor[] = [
  {
    id: 'com-el-sol',
    nombre: 'Comedor Comunitario Rayito de Sol',
    responsable: 'Refe Rente',
    partido: 'Hurlingham',
    direccion: 'Calle Falsa 123',
    telefono: '11-4567-8901',
    capacidadPersonas: 120,
    habilitado: true
  },
  {
    id: 'com-esperanza',
    nombre: 'Comedor La Esperanza',
    responsable: 'Jorge López',
    partido: 'Morón',
    direccion: 'Av. Libertador 450',
    telefono: '11-4567-8902',
    capacidadPersonas: 80,
    habilitado: true
  },
  {
    id: 'com-inhabilitado',
    nombre: 'Merendero Sin Certificado (Bloqueado)',
    responsable: 'Carlos Gómez',
    partido: 'Ituzaingó',
    direccion: 'Los Olivos 999',
    telefono: '11-4567-8903',
    capacidadPersonas: 50,
    habilitado: false
  }
];

export const MOCK_LOTES_INITIAL: Lote[] = [
  {
    id: 'lote-1',
    depositoId: 'dep-hurlingham',
    alimento: 'Leche en Polvo Entera 1kg',
    codigoLote: 'LP-2026-901',
    stockDisponible: 250,
    unidadMedida: 'cajas',
    fechaVencimiento: '2027-04-15',
    donanteOrigen: 'Lácteos La Serenísima'
  },
  {
    id: 'lote-2',
    depositoId: 'dep-hurlingham',
    alimento: 'Fideos Secos Guiseros 500g',
    codigoLote: 'FS-2026-302',
    stockDisponible: 400,
    unidadMedida: 'paquetes',
    fechaVencimiento: '2027-08-30',
    donanteOrigen: 'Molinos Río de la Plata'
  },
  {
    id: 'lote-3',
    depositoId: 'dep-hurlingham',
    alimento: 'Arroz Largo Fino 1kg',
    codigoLote: 'AR-2026-118',
    stockDisponible: 300,
    unidadMedida: 'bolsas',
    fechaVencimiento: '2027-11-20',
    donanteOrigen: 'Distribuidora Central S.A.'
  },
  {
    id: 'lote-4',
    depositoId: 'dep-hurlingham',
    alimento: 'Aceite de Girasol 900ml',
    codigoLote: 'AC-2026-554',
    stockDisponible: 120,
    unidadMedida: 'botellas',
    fechaVencimiento: '2027-02-10',
    donanteOrigen: 'Aceitera General Deheza'
  },
  {
    id: 'lote-5',
    depositoId: 'dep-hurlingham',
    alimento: 'Lentejas Secas Seleccionadas 500g',
    codigoLote: 'LT-2026-009',
    stockDisponible: 180,
    unidadMedida: 'paquetes',
    fechaVencimiento: '2027-09-05',
    donanteOrigen: 'Legumbres del Plata'
  }
];

export const MOCK_ENTREGAS_INITIAL: Entrega[] = [
  {
    id: 'ent-001',
    depositoId: 'dep-hurlingham',
    depositoNombre: 'Depósito Regional N° 1 - Hurlingham',
    comedorId: 'com-el-sol',
    comedorNombre: 'Comedor Comunitario Rayito de Sol',
    estado: 'PENDIENTE',
    fechaCreacion: '2026-10-26T14:30:00Z',
    createdBy: 'Vol Untario',
    items: [
      {
        loteId: 'lote-1',
        alimento: 'Leche en Polvo Entera 1kg',
        codigoLote: 'LP-2026-901',
        cantidad: 30,
        unidadMedida: 'cajas'
      },
      {
        loteId: 'lote-2',
        alimento: 'Fideos Secos Guiseros 500g',
        codigoLote: 'FS-2026-302',
        cantidad: 50,
        unidadMedida: 'paquetes'
      }
    ],
    observaciones: 'Despacho matutino en camioneta provincial #4'
  },
  {
    id: 'ent-000',
    depositoId: 'dep-hurlingham',
    depositoNombre: 'Depósito Regional N° 1 - Hurlingham',
    comedorId: 'com-esperanza',
    comedorNombre: 'Comedor La Esperanza',
    estado: 'ENTREGADO',
    fechaCreacion: '2026-10-25T10:00:00Z',
    fechaRecepcion: '2026-10-25',
    horarioRecepcion: '16:45',
    createdBy: 'Vol Untario',
    items: [
      {
        loteId: 'lote-3',
        alimento: 'Arroz Largo Fino 1kg',
        codigoLote: 'AR-2026-118',
        cantidad: 40,
        unidadMedida: 'bolsas'
      }
    ],
    observaciones: 'Entregado con acta de conformidad firmada'
  }
];
