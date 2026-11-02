% Mock del sistema de rendicion de cuentas del ministerio.
% Recibe el lote nocturno de entregas y las guarda en memoria.

:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).

:- initialization(main, main).

% Almacenamiento temporal en memoria: un lote por cada POST recibido.
:- dynamic lote/1.

% ---------- Rutas ----------

:- http_handler(root('api/rendicion-cuentas'), rendicion_cuentas, [methods([get, post])]).
:- http_handler(root(health), health, [method(get)]).

health(_Request) :-
    reply_json_dict(_{status: "ok"}).

rendicion_cuentas(Request) :-
    memberchk(method(Method), Request),
    atender(Method, Request).

% POST: recibe las entregas del dia (array JSON, o {"entregas": [...]}).
atender(post, Request) :-
    (   catch(http_read_json_dict(Request, Body), _, fail),
        extraer_entregas(Body, Entregas)
    ->  registrar_lote(Entregas, Lote),
        del_dict(entregas, Lote, _, Resumen),
        reply_json_dict(Resumen, [status(201)])
    ;   reply_json_dict(
            _{error: "Se esperaba un JSON con la lista de entregas"},
            [status(400)])
    ).

% GET: devuelve todo lo registrado hasta el momento.
atender(get, _Request) :-
    findall(L, lote(L), Lotes),
    length(Lotes, TotalLotes),
    findall(C, (member(L, Lotes), get_dict(cantidad, L, C)), Cantidades),
    sum_list(Cantidades, TotalEntregas),
    reply_json_dict(_{ total_lotes: TotalLotes,
                       total_entregas: TotalEntregas,
                       lotes: Lotes }).

% ---------- Logica ----------

extraer_entregas(Body, Entregas) :-
    is_list(Body), !,
    Entregas = Body.
extraer_entregas(Body, Entregas) :-
    is_dict(Body),
    get_dict(entregas, Body, Entregas),
    is_list(Entregas).

registrar_lote(Entregas, Lote) :-
    flag(lote_id, N, N + 1),
    Id is N + 1,
    get_time(Now),
    format_time(atom(Fecha), '%FT%T%:z', Now),
    length(Entregas, Cantidad),
    Lote = _{ id: Id,
              recibido_en: Fecha,
              cantidad: Cantidad,
              entregas: Entregas },
    assertz(lote(Lote)),
    format(user_error, "Lote ~w recibido con ~w entregas~n", [Id, Cantidad]).

% ---------- Arranque ----------

cerrar(_Signal) :- halt(0).

main :-
    on_signal(term, _, cerrar),
    (   getenv('PORT', P), atom_number(P, Port) -> true ; Port = 7777 ),
    http_server(http_dispatch, [port(Port)]),
    format(user_error, "Rendicion de cuentas escuchando en el puerto ~w~n", [Port]),
    thread_get_message(_).