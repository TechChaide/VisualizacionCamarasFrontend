
// Este archivo ya no es necesario para la configuración de la API_URL en Next.js.
// La configuración se ha movido al archivo .env en la raíz del proyecto.
// Puedes eliminar este archivo si lo deseas, o mantenerlo si tiene otras configuraciones.

export const environment = {
    production: true,
    nombreAplicacion: "APP_VISOR_CAMARAS",

    // Apps con las que se valida el acceso en el login
    aplicaciones: ["APP_VISOR_CAMARAS"],

    // Apps cuyo menú se carga desde seguridades según el perfil del usuario
    aplicacionesMenu: ["APP_VISOR_CAMARAS"],

    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

    ////////////////////////////////////////Api de Seguridades
    //apiURL : '/seguridades/api',
    //apiURL : 'http://localhost:5400',
    apiURL : 'https://apps.chaide.com/seguridadesGuard',
    

    ///////////////////////////////////////Api de recono
    // apicimiento Facial
    //apiAuthFacial: 'http://192.168.205.95:5000',

    apiAuthFacial: 'https://apps.chaide.com/AServiceUth2-test',



    /////////////////////////////////////Api Propia de la Aplicación
    // CamarasVisor API (FastAPI) - incluye su BASE_PATH (/camarasVba)
    appAPI: 'http://localhost:8000/camarasVba',

    tituloSistema: 'SISTEMA INTEGRADO DE SEGURIDADES',
};
