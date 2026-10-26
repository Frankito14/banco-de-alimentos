{-# LANGUAGE OverloadedStrings #-}

module Main (main) where

import Data.Aeson (ToJSON (..), object, (.=))
import Data.List (find)
import Data.Text (Text)
import Network.HTTP.Types.Status (status404)
import System.Environment (lookupEnv)
import Web.Scotty

data Comedor = Comedor
  { comedorId        :: Int
  , comedorNombre    :: Text
  , comedorProvincia :: Text
  , comedorDireccion :: Text
  }

instance ToJSON Comedor where
  toJSON c =
    object
      [ "id"        .= comedorId c
      , "nombre"    .= comedorNombre c
      , "provincia" .= comedorProvincia c
      , "direccion" .= comedorDireccion c
      ]


comedorBA :: Int -> Text -> Text -> Comedor
comedorBA i nombre dir = Comedor i nombre "Buenos Aires" dir

comedores :: [Comedor]
comedores =
  [ comedorBA 1  "Comedor Los Pibes"            "Av. Rivadavia 18450, Moron"
  , comedorBA 2  "Comedor Esperanza"            "Calle 12 N 1450, La Plata"
  , comedorBA 3  "Merendero Manos Solidarias"   "Mitre 345, Merlo"
  , comedorBA 4  "Comedor Barrio Unido"         "Av. Mosconi 2780, Quilmes"
  , comedorBA 5  "Comedor Santa Rita"           "San Martin 1020, Mar del Plata"
  , comedorBA 6  "Comedor Corazon Abierto"      "Belgrano 560, Bahia Blanca"
  , comedorBA 7  "Olla Popular El Hornito"      "Ruta 5 Km 98, Lujan"
  , comedorBA 8  "Comedor Nuestra Senora de Lujan" "Alsina 870, Lomas de Zamora"
  , comedorBA 9  "Comedor Los Ceibos"           "Av. Hipolito Yrigoyen 3200, Lanus"
  , comedorBA 10 "Comedor Sol de Mayo"          "25 de Mayo 410, Tandil"
  ]

main :: IO ()
main = do
  port <- maybe 6767 read <$> lookupEnv "PORT"
  putStrLn ("Sistema de padrón provincial escuchando en el puerto " ++ show (port :: Int))
  scotty port $ do
   
    get "/health" $
      json (object ["status" .= ("ok" :: Text)])

    
    get "/comedores" $
      json comedores

   
    get "/comedores/:id" $ do
      cid <- captureParam "id"
      case find ((== cid) . comedorId) comedores of
        Just c  -> json c
        Nothing -> do
          status status404
          json (object ["error" .= ("Comedor no encontrado" :: Text)])