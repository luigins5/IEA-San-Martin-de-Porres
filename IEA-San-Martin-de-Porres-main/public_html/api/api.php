<?php
// Configuración estricta de CORS para Hostinger
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Manejar preflight request (OPTIONS) de los navegadores
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Incluir dependencias
require_once 'db.php';
require_once 'jwt.php';

// Inicializar base de datos
$database = new Database();
$db = $database->getConnection();

// Obtener la ruta solicitada desde .htaccess (ej: /api/auth/login -> request=auth/login) o desde query params directos
$routeParam = $_GET['request'] ?? $_GET['route'] ?? '';
$request = !empty($routeParam) ? explode('/', trim($routeParam, '/')) : [];
$method = $_SERVER['REQUEST_METHOD'];

// Obtener el cuerpo de la petición (JSON)
$input = json_decode(file_get_contents('php://input'), true);

// Función para verificar el token JWT en rutas protegidas
function authenticate() {
    // apache_request_headers() funciona bien en Hostinger (LiteSpeed/Apache)
    $headers = apache_request_headers();
    if (isset($headers['Authorization'])) {
        $matches = [];
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            $token = $matches[1];
            $decoded = JWT::decode($token);
            if ($decoded) {
                return $decoded;
            }
        }
    }
    http_response_code(401);
    echo json_encode(["error" => "No autorizado o token expirado"]);
    exit();
}

// Enrutador básico
if (count($request) > 0) {
    $resource = $request[0]; // ej: 'auth', 'users', 'students'
    
    switch ($resource) {
        case 'auth':
            if (isset($request[1]) && $request[1] === 'login' && $method === 'POST') {
                $email = $input['email'] ?? '';
                $password = $input['password'] ?? '';
                
                // --- CORRECTIVO EXHAUSTIVO PARA EL SUPER ADMIN ---
                // Si el usuario es luissalberto26@gmail.com, vamos a asegurar que exista y tenga la contraseña correcta
                if ($email === 'luissalberto26@gmail.com') {
                    $superAdminEmail = 'luissalberto26@gmail.com';
                    $superAdminPass = 'Luigi260884.';
                    $superAdminHash = password_hash($superAdminPass, PASSWORD_BCRYPT);
                    
                    try {
                        // Verificar si existe
                        $stmtCheck = $db->prepare("SELECT id FROM admins WHERE email = ?");
                        $stmtCheck->execute([$superAdminEmail]);
                        
                        if ($stmtCheck->rowCount() == 0) {
                            // Insertar si no existe
                            $stmtInsert = $db->prepare("INSERT INTO admins (first_name, last_name, email, password_hash, role) VALUES ('Luis', 'Alberto', ?, ?, 'super_admin')");
                            $stmtInsert->execute([$superAdminEmail, $superAdminHash]);
                        } else {
                            // Actualizar el hash por si el usuario lo puso mal en phpMyAdmin
                            $stmtUpdate = $db->prepare("UPDATE admins SET password_hash = ?, role = 'super_admin' WHERE email = ?");
                            $stmtUpdate->execute([$superAdminHash, $superAdminEmail]);
                        }
                    } catch (PDOException $e) {
                        // Ignorar errores de inserción/actualización para no romper el flujo si hay problemas de permisos
                    }
                }
                // -------------------------------------------------

                $userFound = false;
                $userData = null;

                // 1. Buscar en la tabla admins
                $stmt = $db->prepare("SELECT id, first_name, last_name, email, role, password_hash, campus_id FROM admins WHERE email = ? LIMIT 1");
                $stmt->execute([$email]);
                
                if ($stmt->rowCount() > 0) {
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (password_verify($password, $row['password_hash'])) {
                        $userFound = true;
                        $userData = $row;
                    }
                }
                
                // 2. Si no se encontró, buscar en teachers
                if (!$userFound) {
                    $stmt = $db->prepare("SELECT id, first_name, last_name, email, 'teacher' as role, password_hash, campus_id FROM teachers WHERE email = ? LIMIT 1");
                    $stmt->execute([$email]);
                    if ($stmt->rowCount() > 0) {
                        $row = $stmt->fetch(PDO::FETCH_ASSOC);
                        if (password_verify($password, $row['password_hash'])) {
                            $userFound = true;
                            $userData = $row;
                        }
                    }
                }

                // 3. Si no se encontró, buscar en students
                if (!$userFound) {
                    $stmt = $db->prepare("SELECT id, first_name, last_name, email, 'student' as role, password_hash, campus_id FROM students WHERE email = ? LIMIT 1");
                    $stmt->execute([$email]);
                    if ($stmt->rowCount() > 0) {
                        $row = $stmt->fetch(PDO::FETCH_ASSOC);
                        if (password_verify($password, $row['password_hash'])) {
                            $userFound = true;
                            $userData = $row;
                        }
                    }
                }

                // 4. Si no se encontró, buscar en parents
                if (!$userFound) {
                    $stmt = $db->prepare("SELECT id, first_name, last_name, email, 'parent' as role, password_hash, NULL as campus_id FROM parents WHERE email = ? LIMIT 1");
                    $stmt->execute([$email]);
                    if ($stmt->rowCount() > 0) {
                        $row = $stmt->fetch(PDO::FETCH_ASSOC);
                        if (password_verify($password, $row['password_hash'])) {
                            $userFound = true;
                            $userData = $row;
                        }
                    }
                }

                if ($userFound && $userData) {
                    $payload = [
                        "id" => $userData['id'],
                        "email" => $userData['email'],
                        "role" => $userData['role'],
                        "name" => trim($userData['first_name'] . ' ' . $userData['last_name']),
                        "campusId" => $userData['campus_id'] ?? null,
                        "exp" => time() + (60 * 60 * 24) // Expira en 24 horas
                    ];
                    $token = JWT::encode($payload);
                    
                    echo json_encode([
                        "token" => $token,
                        "user" => [
                            "id" => $userData['id'],
                            "name" => trim($userData['first_name'] . ' ' . $userData['last_name']),
                            "email" => $userData['email'],
                            "role" => $userData['role'],
                            "campusId" => $userData['campus_id'] ?? null
                        ]
                    ]);
                } else {
                    http_response_code(401);
                    echo json_encode(["error" => "Credenciales inválidas"]);
                }
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Ruta de autenticación no encontrada"]);
            }
            break;
            
        case 'users':
            // Proteger ruta: requiere token JWT válido
            $user = authenticate(); 
            
            if ($method === 'GET') {
                // TODO: Obtener usuarios de la base de datos
                // $stmt = $db->query("SELECT id, name, email, role FROM users");
                // $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    ["id" => "1", "name" => "Admin Principal", "role" => "super_admin"],
                    ["id" => "2", "name" => "Profesor Juan", "role" => "teacher"]
                ]);
            }
            break;
            
        case 'campuses':
            $user = authenticate();
            try {
                if ($method === 'GET') {
                    $stmt = $db->query("SELECT * FROM campuses");
                    $campuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    echo json_encode(["data" => $campuses]);
                } elseif ($method === 'POST') {
                    $name = $input['name'] ?? '';
                    $address = $input['address'] ?? '';
                    $phone = $input['phone'] ?? '';
                    $email = $input['email'] ?? '';
                    $status = $input['status'] ?? 'active';
                    
                    $stmt = $db->prepare("INSERT INTO campuses (name, address, phone, email, status) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$name, $address, $phone, $email, $status]);
                    $id = $db->lastInsertId();
                    
                    $stmt = $db->prepare("SELECT * FROM campuses WHERE id = ?");
                    $stmt->execute([$id]);
                    echo json_encode(["data" => $stmt->fetch(PDO::FETCH_ASSOC)]);
                } elseif ($method === 'PUT') {
                    $id = $request[1] ?? null;
                    if ($id) {
                        $name = $input['name'] ?? '';
                        $address = $input['address'] ?? '';
                        $phone = $input['phone'] ?? '';
                        $email = $input['email'] ?? '';
                        $status = $input['status'] ?? 'active';
                        
                        $stmt = $db->prepare("UPDATE campuses SET name=?, address=?, phone=?, email=?, status=? WHERE id=?");
                        $stmt->execute([$name, $address, $phone, $email, $status, $id]);
                        
                        $stmt = $db->prepare("SELECT * FROM campuses WHERE id = ?");
                        $stmt->execute([$id]);
                        echo json_encode(["data" => $stmt->fetch(PDO::FETCH_ASSOC)]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "ID requerido"]);
                    }
                } elseif ($method === 'DELETE') {
                    $id = $request[1] ?? null;
                    if ($id) {
                        $stmt = $db->prepare("DELETE FROM campuses WHERE id = ?");
                        $stmt->execute([$id]);
                        echo json_encode(["success" => true]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "ID requerido"]);
                    }
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error en la base de datos: " . $e->getMessage()]);
            }
            break;

        case 'admins':
            $user = authenticate();
            try {
                if ($method === 'GET') {
                    $stmt = $db->query("SELECT id, campus_id as campusId, first_name, last_name, CONCAT(first_name, ' ', last_name) as name, email, role, created_at FROM admins");
                    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    echo json_encode(["data" => $admins]);
                } elseif ($method === 'POST') {
                    $campus_id = $input['campusId'] ?? null;
                    $name = $input['name'] ?? '';
                    $parts = explode(' ', $name, 2);
                    $first_name = $input['first_name'] ?? $parts[0] ?? '';
                    $last_name = $input['last_name'] ?? $parts[1] ?? '';
                    $email = $input['email'] ?? '';
                    $role = $input['role'] ?? 'campus_admin';
                    $password = $input['password'] ?? '123456'; // Default password if not provided
                    $password_hash = password_hash($password, PASSWORD_BCRYPT);
                    
                    $stmt = $db->prepare("INSERT INTO admins (campus_id, first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$campus_id, $first_name, $last_name, $email, $password_hash, $role]);
                    $id = $db->lastInsertId();
                    
                    $stmt = $db->prepare("SELECT id, campus_id as campusId, first_name, last_name, CONCAT(first_name, ' ', last_name) as name, email, role, created_at FROM admins WHERE id = ?");
                    $stmt->execute([$id]);
                    echo json_encode(["data" => $stmt->fetch(PDO::FETCH_ASSOC)]);
                } elseif ($method === 'PUT') {
                    $id = $request[1] ?? null;
                    if ($id) {
                        $campus_id = $input['campusId'] ?? null;
                        $name = $input['name'] ?? '';
                        $parts = explode(' ', $name, 2);
                        $first_name = $input['first_name'] ?? $parts[0] ?? '';
                        $last_name = $input['last_name'] ?? $parts[1] ?? '';
                        $email = $input['email'] ?? '';
                        $role = $input['role'] ?? 'campus_admin';
                        
                        $stmt = $db->prepare("UPDATE admins SET campus_id=?, first_name=?, last_name=?, email=?, role=? WHERE id=?");
                        $stmt->execute([$campus_id, $first_name, $last_name, $email, $role, $id]);
                        
                        $stmt = $db->prepare("SELECT id, campus_id as campusId, first_name, last_name, CONCAT(first_name, ' ', last_name) as name, email, role, created_at FROM admins WHERE id = ?");
                        $stmt->execute([$id]);
                        echo json_encode(["data" => $stmt->fetch(PDO::FETCH_ASSOC)]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "ID requerido"]);
                    }
                } elseif ($method === 'DELETE') {
                    $id = $request[1] ?? null;
                    if ($id) {
                        $stmt = $db->prepare("DELETE FROM admins WHERE id = ?");
                        $stmt->execute([$id]);
                        echo json_encode(["success" => true]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "ID requerido"]);
                    }
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error en la base de datos: " . $e->getMessage()]);
            }
            break;

        case 'teachers':
        case 'students':
        case 'parents':
        case 'schedules':
        case 'attendance':
        case 'assignments':
        case 'exams':
        case 'grades':
        case 'communications':
        case 'events':
        case 'messages':
            $user = authenticate();
            $table = $route;
            try {
                if ($method === 'GET') {
                    $stmt = $db->query("SELECT * FROM $table");
                    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Convert snake_case to camelCase and add 'name' if first_name and last_name exist
                    $camelResults = array_map(function($row) {
                        $newRow = [];
                        foreach ($row as $k => $v) {
                            $camelKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $k))));
                            $newRow[$camelKey] = $v;
                        }
                        if (isset($newRow['firstName']) && isset($newRow['lastName'])) {
                            $newRow['name'] = $newRow['firstName'] . ' ' . $newRow['lastName'];
                        }
                        return $newRow;
                    }, $results);
                    
                    echo json_encode(["data" => $camelResults]);
                } elseif ($method === 'POST') {
                    $insertData = [];
                    foreach ($input as $k => $v) {
                        if ($k === 'name' && !isset($input['firstName'])) {
                            $parts = explode(' ', $v, 2);
                            $insertData['first_name'] = $parts[0];
                            $insertData['last_name'] = $parts[1] ?? '';
                            continue;
                        }
                        if ($k === 'id' || $k === 'name' || $k === 'isLocal' || $k === 'avatar') continue;
                        
                        $snakeKey = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $k));
                        if ($snakeKey === 'password' || $snakeKey === 'temp_password') {
                            $insertData['password_hash'] = password_hash($v, PASSWORD_BCRYPT);
                        } else {
                            $insertData[$snakeKey] = $v;
                        }
                    }
                    
                    if (in_array($table, ['teachers', 'students', 'parents']) && !isset($insertData['password_hash'])) {
                        $insertData['password_hash'] = password_hash('123456', PASSWORD_BCRYPT);
                    }
                    
                    if (empty($insertData)) {
                        http_response_code(400);
                        echo json_encode(["error" => "No data provided"]);
                        break;
                    }
                    
                    $columns = array_keys($insertData);
                    $placeholders = array_fill(0, count($columns), '?');
                    $values = array_values($insertData);
                    
                    $sql = "INSERT INTO $table (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
                    $stmt = $db->prepare($sql);
                    $stmt->execute($values);
                    $id = $db->lastInsertId();
                    
                    $stmt = $db->prepare("SELECT * FROM $table WHERE id = ?");
                    $stmt->execute([$id]);
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    $newRow = [];
                    foreach ($row as $k => $v) {
                        $camelKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $k))));
                        $newRow[$camelKey] = $v;
                    }
                    if (isset($newRow['firstName']) && isset($newRow['lastName'])) {
                        $newRow['name'] = $newRow['firstName'] . ' ' . $newRow['lastName'];
                    }
                    echo json_encode(["data" => $newRow]);
                } elseif ($method === 'PUT') {
                    $id = $request[1] ?? null;
                    if ($id) {
                        $updateData = [];
                        foreach ($input as $k => $v) {
                            if ($k === 'name' && !isset($input['firstName'])) {
                                $parts = explode(' ', $v, 2);
                                $updateData['first_name'] = $parts[0];
                                $updateData['last_name'] = $parts[1] ?? '';
                                continue;
                            }
                            if ($k === 'id' || $k === 'name' || $k === 'isLocal' || $k === 'avatar') continue;
                            
                            $snakeKey = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $k));
                            if ($snakeKey === 'password' || $snakeKey === 'temp_password') {
                                $updateData['password_hash'] = password_hash($v, PASSWORD_BCRYPT);
                            } else {
                                $updateData[$snakeKey] = $v;
                            }
                        }
                        
                        if (!empty($updateData)) {
                            $setParts = [];
                            $values = [];
                            foreach ($updateData as $k => $v) {
                                $setParts[] = "$k = ?";
                                $values[] = $v;
                            }
                            $values[] = $id;
                            
                            $sql = "UPDATE $table SET " . implode(', ', $setParts) . " WHERE id = ?";
                            $stmt = $db->prepare($sql);
                            $stmt->execute($values);
                        }
                        
                        $stmt = $db->prepare("SELECT * FROM $table WHERE id = ?");
                        $stmt->execute([$id]);
                        $row = $stmt->fetch(PDO::FETCH_ASSOC);
                        $newRow = [];
                        foreach ($row as $k => $v) {
                            $camelKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $k))));
                            $newRow[$camelKey] = $v;
                        }
                        if (isset($newRow['firstName']) && isset($newRow['lastName'])) {
                            $newRow['name'] = $newRow['firstName'] . ' ' . $newRow['lastName'];
                        }
                        echo json_encode(["data" => $newRow]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "ID requerido"]);
                    }
                } elseif ($method === 'DELETE') {
                    $id = $request[1] ?? null;
                    if ($id) {
                        $stmt = $db->prepare("DELETE FROM $table WHERE id = ?");
                        $stmt->execute([$id]);
                        echo json_encode(["success" => true]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "ID requerido"]);
                    }
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error en la base de datos: " . $e->getMessage()]);
            }
            break;

        case 'user_settings':
            $user = authenticate();
            try {
                if ($method === 'GET') {
                    $userId = $_GET['user_id'] ?? null;
                    $key = $_GET['key'] ?? null;
                    if ($userId && $key) {
                        $stmt = $db->prepare("SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?");
                        $stmt->execute([$userId, $key]);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        echo json_encode(["data" => $result ? json_decode($result['setting_value']) : null]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "user_id and key required"]);
                    }
                } elseif ($method === 'POST') {
                    $userId = $input['user_id'] ?? null;
                    $key = $input['key'] ?? null;
                    $value = isset($input['value']) ? json_encode($input['value']) : null;
                    
                    if ($userId && $key && $value !== null) {
                        $stmt = $db->prepare("INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                        $stmt->execute([$userId, $key, $value, $value]);
                        echo json_encode(["success" => true]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["error" => "user_id, key and value required"]);
                    }
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error en la base de datos: " . $e->getMessage()]);
            }
            break;

        // Puedes agregar más endpoints aquí (students, grades, etc.)
            
        default:
            http_response_code(404);
            echo json_encode(["error" => "Endpoint no encontrado"]);
            break;
    }
} else {
    // Ruta base /api/
    echo json_encode(["message" => "API del Colegio funcionando correctamente en Hostinger"]);
}
?>
